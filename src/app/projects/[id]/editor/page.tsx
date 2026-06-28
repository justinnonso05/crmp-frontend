'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import type QuillType from 'quill';
import type QuillCursorsType from 'quill-cursors';
import 'quill/dist/quill.snow.css';
import { getSocket } from '@/lib/socket';
import { apiFetch, getUser } from '@/lib/api';
import { DOCUMENTS, PROPOSAL, PROJECTS } from '@/lib/endpoints';
import Link from 'next/link';

interface Document {
  id: string;
  projectId: string;
  title: string;
  content: any;
  lastModifiedBy: string;
}

export default function CollaborativeEditorPage() {
  const router = useRouter();
  const { id: projectId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const documentId = searchParams.get('doc');

  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<QuillType | null>(null);
  const cursorsRef = useRef<QuillCursorsType | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string, firstName: string, lastName: string } | null>(null);

  // Load user
  useEffect(() => {
    setCurrentUser(getUser());
  }, []);

  // Fetch document
  useEffect(() => {
    if (!documentId) {
      setError('No document ID provided.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const [d, p] = await Promise.all([
          apiFetch<{ document: Document }>(DOCUMENTS.DETAIL(documentId)),
          apiFetch<{ project: any }>(PROJECTS.DETAIL(projectId as string))
        ]);
        setDoc(d.document);
        setProject(p.project);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId]);

  // Setup Quill and WebSockets
  useEffect(() => {
    if (!doc || !project || !currentUser || !documentId || !editorRef.current) return;

    let isSubscribed = true;

    let socketCleanup: (() => void) | null = null;

    // 1. Initialize Quill Dynamically
    if (!quillRef.current) {
      Promise.all([
        import('quill'),
        import('quill-cursors')
      ]).then(([QuillModule, QuillCursorsModule]) => {
        if (!isSubscribed) return;

        const Quill = QuillModule.default;
        const QuillCursors = QuillCursorsModule.default;

        if (!Quill.imports['modules/cursors']) {
          Quill.register('modules/cursors', QuillCursors);
        }

        const quill = new Quill(editorRef.current!, {
          theme: 'snow',
          modules: {
            cursors: true,
            toolbar: [
              [{ font: [] }],
              [{ header: [1, 2, 3, 4, 5, 6, false] }],
              [{ size: ['small', false, 'large', 'huge'] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ color: [] }, { background: [] }],
              [{ script: 'sub' }, { script: 'super' }],
              [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
              [{ direction: 'rtl' }],
              [{ align: [] }],
              ['link', 'image', 'video'],
              ['blockquote', 'code-block'],
              ['clean'],
            ],
          },
        });
        quillRef.current = quill;
        cursorsRef.current = quill.getModule('cursors') as QuillCursorsType;

        if (doc.content) {
          quill.setContents(doc.content);
        }

        const member = project.members?.find((m: any) => m.userId === currentUser.id);
        const canWrite = member && ['PI', 'CO_INVESTIGATOR', 'ASSISTANT'].includes(member.role);
        const isLocked = project.proposal?.status === 'SUBMITTED' || project.proposal?.status === 'APPROVED';

        if (!canWrite || isLocked) {
          quill.disable();
        }

        setupSockets(quill, cursorsRef.current);
      });
    } else {
      setupSockets(quillRef.current, cursorsRef.current!);
    }

    function setupSockets(quill: QuillType, cursors: QuillCursorsType) {
      const socket = getSocket();
      socket.connect();

      // 2. Join the document room
      const joinRoom = () => socket.emit('join-document', documentId, currentUser!.id);
      if (socket.connected) joinRoom();
      socket.on('connect', joinRoom);

      // 3. Handle incoming text changes
      const handleReceiveChanges = (delta: any) => {
        quill.updateContents(delta);
      };
      socket.on('receive-changes', handleReceiveChanges);

      // 4. Handle outgoing text changes
      const handleTextChange = (delta: any, oldDelta: any, source: string) => {
        if (source === 'user') {
          socket.emit('send-changes', documentId, delta);
          debouncedSave();
        }
      };
      quill.on('text-change', handleTextChange);

      // 5. Handle cursor sync
      const handleSelectionChange = (range: any, oldRange: any, source: string) => {
        if (source === 'user') {
          socket.emit('cursor-move', documentId, {
            userId: currentUser!.id,
            name: currentUser!.firstName,
            range,
          });
        }
      };
      quill.on('selection-change', handleSelectionChange);

      const handleCursorUpdate = (data: { userId: string, name: string, range: any }) => {
        if (!cursors) return;
        if (!data.range) {
          cursors.removeCursor(data.userId);
          return;
        }
        try {
          cursors.createCursor(data.userId, data.name, '#4f46e5');
        } catch (e) {}
        cursors.moveCursor(data.userId, data.range);
      };
      socket.on('cursor-update', handleCursorUpdate);

      // 6. Handle users leaving
      const handleUserLeft = (data: { userId: string }) => {
        cursors?.removeCursor(data.userId);
      };
      socket.on('user-left', handleUserLeft);

      socketCleanup = () => {
        quill.off('text-change', handleTextChange);
        quill.off('selection-change', handleSelectionChange);
        socket.off('connect', joinRoom);
        socket.off('receive-changes', handleReceiveChanges);
        socket.off('cursor-update', handleCursorUpdate);
        socket.off('user-left', handleUserLeft);
        socket.emit('leave-document', documentId, currentUser!.id);
        socket.disconnect();
      };
    }

    // Cleanup
    return () => {
      isSubscribed = false;
      if (socketCleanup) socketCleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, doc, currentUser, documentId]);

  // Auto-save logic
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!quillRef.current || !documentId) return;
      setSaving(true);
      try {
        const content = quillRef.current.getContents();
        await apiFetch(DOCUMENTS.SAVE(documentId), {
          method: 'PUT',
          body: JSON.stringify({ content }),
        });
      } catch (e) {
        console.error('Failed to auto-save document:', e);
      } finally {
        setSaving(false);
      }
    }, 2000);
  };

  const exportToDoc = () => {
    if (!quillRef.current || !doc) return;
    const htmlContent = quillRef.current.root.innerHTML;
    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${doc.title}</title></head><body>`;
    const postHtml = `</body></html>`;
    const html = preHtml + htmlContent + postHtml;
    
    const blob = new Blob(['\\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title || 'document'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmitProposal = async () => {
    setSubmitting(true);
    try {
      await apiFetch(PROPOSAL.SUBMIT(projectId as string), { method: 'POST' });
      // Redirect back to project dashboard after submission
      router.push(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit proposal.');
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  if (loading) return <div className="dash-empty">Loading editor...</div>;
  if (error) return <div className="dash-empty" style={{ color: 'var(--error)' }}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--surface)' }}>
      {/* Top Navigation Bar */}
      <header className="editor-header">
        <div className="editor-header-left">
          <Link href={`/projects/${projectId}`} className="dash-btn-ghost editor-back-btn">
            ← Back
          </Link>
          <h1 className="proj-title editor-title">{doc?.title}</h1>
        </div>
        <div className="editor-header-right">
          <div className="editor-save-status">
            {saving ? 'Saving...' : 'Saved'}
          </div>
          <button onClick={() => setShowHints(true)} className="dash-btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            💡 {doc?.title?.toLowerCase().includes('literature') ? 'Literature Review Guide' : doc?.title?.toLowerCase().includes('qualitative') || doc?.title?.toLowerCase().includes('data') ? 'Data Collection Guide' : doc?.title?.toLowerCase().includes('report') ? 'Report Writing Guide' : 'Proposal Guidelines'}
          </button>
          <button onClick={exportToDoc} className="dash-btn-primary editor-export-btn">
            <span className="export-text-full">Export to .doc</span>
            <span className="export-text-mobile">Export</span>
          </button>
          {doc?.title?.toLowerCase().includes('proposal') && project?.proposal?.status !== 'SUBMITTED' && project?.proposal?.status !== 'APPROVED' && (
            <button onClick={() => setShowSubmitConfirm(true)} className="dash-btn-primary" style={{ background: '#111', color: '#fff', marginLeft: '0.5rem' }}>
              Submit Proposal →
            </button>
          )}
        </div>
      </header>

      {/* Editor Container */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '900px', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div ref={editorRef} style={{ flex: 1, minHeight: '600px', border: 'none' }} />
        </div>
      </main>

      {/* Hints Modal */}
      {showHints && (
        <div className="modal-backdrop" onClick={() => setShowHints(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,24,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ background: 'var(--paper)', maxWidth: '600px', width: '100%', padding: '2rem', borderRadius: '8px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                {doc?.title?.toLowerCase().includes('literature') ? 'Literature Review Guide' : doc?.title?.toLowerCase().includes('qualitative') || doc?.title?.toLowerCase().includes('data') ? 'Data Collection Guide' : doc?.title?.toLowerCase().includes('report') ? 'Report Writing Guide' : 'Proposal Guidelines'}
              </h2>
            </div>
            <div style={{ lineHeight: 1.6, fontSize: '0.9rem', color: 'rgba(26,26,24,0.8)', maxHeight: '60vh', overflowY: 'auto' }}>
              {doc?.title?.toLowerCase().includes('literature') ? (
                <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', listStyleType: 'disc' }}>
                  <li><strong>Introduction:</strong> Define the scope, context, and purpose of your review.</li>
                  <li><strong>Theoretical Framework:</strong> Discuss the core theories or models that support your study.</li>
                  <li><strong>Methodological Review:</strong> Evaluate how previous researchers have approached this problem.</li>
                  <li><strong>Identification of Gaps:</strong> Clearly state what is missing, contradictory, or unresolved in the current literature. This justifies your project!</li>
                  <li><strong>Conclusion & Transition:</strong> Summarise your findings and smoothly transition into your own project's proposed methodology.</li>
                </ul>
              ) : doc?.title?.toLowerCase().includes('qualitative') || doc?.title?.toLowerCase().includes('data') ? (
                <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', listStyleType: 'disc' }}>
                  <li><strong>Date & Time:</strong> Record when the data collection occurred.</li>
                  <li><strong>Setting / Context:</strong> Describe the environment where the interview or observation took place.</li>
                  <li><strong>Participant Info:</strong> Provide relevant, anonymous demographic details of the participant(s).</li>
                  <li><strong>Key Responses:</strong> Transcribe or comprehensively summarise the most important answers or observed behaviors.</li>
                  <li><strong>Researcher Notes:</strong> Add your own analytical notes, initial interpretations, and context.</li>
                </ul>
              ) : doc?.title?.toLowerCase().includes('report') ? (
                <ol style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <li><strong>Abstract:</strong> A brief 150-250 word summary of the entire study, from objectives to key conclusions.</li>
                  <li><strong>Introduction:</strong> Restate the problem, research objectives, and the significance of the study.</li>
                  <li><strong>Methodology:</strong> Detail how data was collected and analyzed.</li>
                  <li><strong>Results & Findings:</strong> Present the raw data objectively, using tables and figures if necessary.</li>
                  <li><strong>Discussion:</strong> Interpret the findings, connect them back to your literature review, and discuss implications.</li>
                  <li><strong>Conclusion:</strong> Summarise the overall outcome and suggest areas for future research.</li>
                </ol>
              ) : (
                <ol style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <li><strong>Title:</strong> A clear, concise statement of the research topic.</li>
                  <li><strong>Abstract:</strong> A brief summary (150-250 words) covering objectives, methodology, and expected outcomes.</li>
                  <li><strong>Introduction & Background:</strong> Contextualise the problem and state why it is significant.</li>
                  <li><strong>Statement of the Problem:</strong> Clearly define the specific issue the research will address.</li>
                  <li><strong>Objectives:</strong> List primary and secondary research goals.</li>
                  <li><strong>Literature Review:</strong> Summarise existing research and identify the gap this project fills.</li>
                  <li><strong>Methodology:</strong> Describe the study design, data collection methods (e.g. surveys, interviews), and analysis techniques.</li>
                  <li><strong>Timeline & Budget:</strong> A brief projection of project milestones and estimated costs.</li>
                  <li><strong>References:</strong> Cite all sources using standard academic formatting (APA, IEEE, etc.).</li>
                </ol>
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowHints(false)} className="dash-btn-primary">Got it</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="modal-backdrop" onClick={() => !submitting && setShowSubmitConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,24,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ background: 'var(--paper)', maxWidth: '500px', width: '100%', padding: '2rem', borderRadius: '8px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Submit Proposal?</h2>
            </div>
            <div style={{ lineHeight: 1.6, fontSize: '1rem', color: 'rgba(26,26,24,0.8)' }}>
              <p>Are you sure you are ready to submit this proposal for review?</p>
              <p style={{ marginTop: '1rem', color: 'var(--error)', fontWeight: 600 }}>
                Once submitted, this document will be locked and you will not be able to make further edits while it is under review.
              </p>
            </div>
            <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setShowSubmitConfirm(false)} className="dash-btn-ghost" disabled={submitting}>Cancel</button>
              <button onClick={handleSubmitProposal} className="dash-btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Yes, Submit Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS overrides for Quill to match our theme */}
      <style dangerouslySetInnerHTML={{__html: `
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid rgba(0,0,0,0.1) !important;
          background: #fafafa;
          padding: 1rem !important;
        }
        .ql-container.ql-snow {
          border: none !important;
          font-family: inherit !important;
          font-size: 1rem !important;
        }
        .ql-editor {
          padding: 2rem !important;
          line-height: 1.6;
        }
        .editor-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 2rem; border-bottom: 1px solid rgba(0,0,0,0.05); background-color: var(--bg);
        }
        .editor-header-left { display: flex; align-items: center; gap: 1rem; }
        .editor-header-right { display: flex; align-items: center; gap: 1rem; }
        .editor-back-btn { padding: 0.5rem; }
        .editor-title { font-size: 1.25rem; margin: 0; }
        .editor-save-status { font-size: 0.85rem; color: var(--text-muted); }
        .editor-export-btn { padding: 0.4rem 0.8rem; font-size: 0.85rem; }
        .export-text-mobile { display: none; }

        @media (max-width: 768px) {
          main { padding: 0 !important; }
          .ql-editor { padding: 1rem !important; }
          .editor-header { 
            padding: 1rem; 
            flex-direction: column; 
            align-items: stretch; 
            gap: 1rem; 
          }
          .editor-header-left { 
            width: 100%; 
            justify-content: space-between; 
          }
          .editor-header-right { 
            width: 100%; 
            flex-direction: row; 
            flex-wrap: wrap;
            justify-content: flex-end; 
            align-items: center; 
            gap: 0.5rem; 
          }
          .export-text-full { display: none; }
          .export-text-mobile { display: inline; }
          .editor-title { font-size: 1rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        }
      `}} />
    </div>
  );
}
