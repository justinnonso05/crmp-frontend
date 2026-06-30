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
  const [isFullScreen, setIsFullScreen] = useState(false);
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
        // Only lock the editor for the proposal document specifically when it's under review
        const isProposalDoc = doc.title?.toLowerCase().includes('proposal');
        const proposalLocked = isProposalDoc && (project.proposal?.status === 'SUBMITTED' || project.proposal?.status === 'APPROVED');

        if (!canWrite || proposalLocked) {
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

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
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
      {!isFullScreen && (
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
            <button onClick={toggleFullScreen} className="dash-btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              ⛶ Fullscreen
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
      )}

      {/* Editor Container */}
      <main style={{ 
        flex: 1, 
        padding: isFullScreen ? '0' : '2rem', 
        display: 'flex', 
        justifyContent: 'center', 
        overflowY: 'hidden', /* we want the editor to handle scroll, not the main */
        position: 'relative'
      }}>
        {isFullScreen && (
          <button 
            onClick={toggleFullScreen}
            style={{ 
              position: 'fixed', 
              top: '1rem', 
              right: '1.5rem', 
              zIndex: 9999, 
              background: 'var(--paper)', 
              color: 'var(--text)', 
              border: '1px solid rgba(0,0,0,0.1)', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              padding: '0.5rem 1rem', 
              borderRadius: '20px', 
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            ✕ Exit Fullscreen
          </button>
        )}
        <div style={{ 
          width: '100%', 
          maxWidth: isFullScreen ? '100%' : '900px', 
          backgroundColor: '#ffffff', 
          border: isFullScreen ? 'none' : '1px solid rgba(0,0,0,0.1)', 
          boxShadow: isFullScreen ? 'none' : '0 4px 20px rgba(0,0,0,0.03)', 
          borderRadius: isFullScreen ? '0' : '8px', 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column',
          height: isFullScreen ? '100vh' : 'auto',
          position: isFullScreen ? 'fixed' : 'relative',
          inset: isFullScreen ? 0 : 'auto',
          zIndex: isFullScreen ? 9998 : 1
        }}>
          <div ref={editorRef} style={{ flex: 1, minHeight: isFullScreen ? '100vh' : '600px', border: 'none', display: 'flex', flexDirection: 'column' }} />
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
            <div style={{ lineHeight: 1.7, fontSize: '0.9rem', color: 'rgba(26,26,24,0.8)', maxHeight: '65vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {doc?.title?.toLowerCase().includes('literature') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <p style={{ margin: 0, padding: '0.75rem 1rem', background: 'rgba(42,124,117,0.07)', borderLeft: '3px solid #2A7C75', borderRadius: '0 4px 4px 0', fontSize: '0.8rem' }}>
                    Your literature review (Chapter 2) should be grounded in <strong>recent works (last 3 years preferred)</strong>. Paraphrase — do not copy verbatim. Give due credit to all cited authors.
                  </p>
                  <div>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1A1A18' }}>Required Sections</strong>
                    <ol style={{ paddingLeft: '1.4rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                      <li><strong>2.1 Conceptual Framework:</strong> Present the conceptual model of the study with explanation of linkages between key concepts.</li>
                      <li><strong>2.2 Theoretical Framework:</strong> Review the major theory/theories related to the topic and indicate their relevance to your study.</li>
                      <li><strong>2.3 Empirical Studies:</strong> Abstract-like review of related works — state the purpose, sample &amp; sampling technique, instruments, analysis method, and major findings.</li>
                      <li><strong>2.4 Appraisal of Reviewed Literature:</strong> Summarise the literature and clearly state the gap that justifies your own study.</li>
                      <li><strong>Summary Table</strong> (end of chapter): Authors &amp; Year · Title · Methodology · Results · Strength(s) · Research Gap.</li>
                    </ol>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1A1A18' }}>AI Tools to Assist</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyleType: 'disc' }}>
                      <li><a href="https://www.perplexity.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Perplexity AI</a> — AI-powered research search with citations</li>
                      <li><a href="https://elicit.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Elicit</a> — extracts key findings from academic papers automatically</li>
                      <li><a href="https://www.semanticscholar.org" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Semantic Scholar</a> — AI-enhanced academic search engine</li>
                      <li><a href="https://consensus.app" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Consensus</a> — search research papers by research question</li>
                      <li><a href="https://scite.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Scite.ai</a> — shows how papers cite others (supporting or contrasting)</li>
                    </ul>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1A1A18' }}>External Resources</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyleType: 'disc' }}>
                      <li><a href="https://scholar.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Google Scholar</a></li>
                      <li><a href="https://ieeexplore.ieee.org" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>IEEE Xplore</a></li>
                      <li><a href="https://www.researchgate.net" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>ResearchGate</a></li>
                      <li><a href="https://www.sciencedirect.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>ScienceDirect</a></li>
                      <li><a href="https://pubmed.ncbi.nlm.nih.gov" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>PubMed</a> (health/biomedical)</li>
                      <li><a href="https://dl.acm.org" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>ACM Digital Library</a> (computing)</li>
                    </ul>
                  </div>
                </div>
              ) : doc?.title?.toLowerCase().includes('analysis') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <p style={{ margin: 0, padding: '0.75rem 1rem', background: 'rgba(42,124,117,0.07)', borderLeft: '3px solid #2A7C75', borderRadius: '0 4px 4px 0', fontSize: '0.8rem' }}>
                    Choose analysis techniques appropriate to your research domain. Use this document to record your process, tools, outputs, and interpretation.
                  </p>
                  <div>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI / ML Research</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyleType: 'disc' }}>
                      <li>AUC-ROC Curve, Confusion Matrix, Precision, Recall, F1-Score</li>
                      <li>Mean Absolute Error (MAE), RMSE for regression tasks</li>
                      <li>BLEU / ROUGE scores for NLP/text generation tasks</li>
                      <li>Cross-validation (k-fold), train/test split ratios</li>
                    </ul>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Software / HCI Research</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyleType: 'disc' }}>
                      <li><a href="https://www.usability.gov/how-to-and-tools/methods/system-usability-scale.html" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>SUS (System Usability Scale)</a> — 10-item usability questionnaire</li>
                      <li><a href="https://en.wikipedia.org/wiki/Technology_acceptance_model" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>TAM (Technology Acceptance Model)</a></li>
                      <li>UTAUT / UTAUT2 for technology adoption studies</li>
                      <li>Heuristic Evaluation, Think-Aloud Protocol</li>
                    </ul>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Social / Survey Research</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyleType: 'disc' }}>
                      <li>Descriptive Statistics (mean, median, standard deviation)</li>
                      <li>Inferential Statistics: t-test, ANOVA, Chi-square, Regression</li>
                      <li>Thematic Analysis for qualitative interviews</li>
                      <li>Likert scale aggregation and frequency tables</li>
                    </ul>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis Tools</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyleType: 'disc' }}>
                      <li><a href="https://www.python.org" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Python</a> (pandas, scikit-learn, matplotlib)</li>
                      <li><a href="https://www.r-project.org" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>R / RStudio</a></li>
                      <li><a href="https://www.ibm.com/spss" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>IBM SPSS</a></li>
                      <li><a href="https://colab.research.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Google Colab</a> (free GPU notebooks)</li>
                    </ul>
                  </div>
                </div>
              ) : doc?.title?.toLowerCase().includes('qualitative') || doc?.title?.toLowerCase().includes('data') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', listStyleType: 'disc' }}>
                    <li><strong>Date &amp; Time:</strong> Record when the data collection occurred.</li>
                    <li><strong>Setting / Context:</strong> Describe the environment where the interview or observation took place.</li>
                    <li><strong>Participant Info:</strong> Provide relevant, anonymous demographic details of the participant(s).</li>
                    <li><strong>Key Responses:</strong> Transcribe or comprehensively summarise the most important answers or observed behaviours.</li>
                    <li><strong>Researcher Notes:</strong> Add your own analytical notes, initial interpretations, and context.</li>
                  </ul>
                </div>
              ) : doc?.title?.toLowerCase().includes('report') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <p style={{ margin: 0, padding: '0.75rem 1rem', background: 'rgba(42,124,117,0.07)', borderLeft: '3px solid #2A7C75', borderRadius: '0 4px 4px 0', fontSize: '0.8rem' }}>
                    The final report follows a standard academic format. Each chapter should be clearly labelled and numbered.
                  </p>
                  <ol style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li><strong>Title Page:</strong> Project title, author name &amp; matric no., supervisor, institution, and year.</li>
                    <li><strong>Approval / Certification Page:</strong> Signed by supervisor and examiner.</li>
                    <li><strong>Dedication, Acknowledgement, Table of Contents, List of Tables/Figures.</strong></li>
                    <li><strong>Abstract:</strong> 150–250 word summary of objectives, methodology, and key findings.</li>
                    <li><strong>Chapter 1 — Introduction:</strong> Background, problem statement, aim &amp; objectives, scope, and significance.</li>
                    <li><strong>Chapter 2 — Literature Review:</strong> Conceptual &amp; Theoretical Framework, Empirical Studies, Appraisal &amp; Gap.</li>
                    <li><strong>Chapter 3 — Methodology:</strong> Research design, population &amp; sampling, instruments, data collection procedure, analysis technique.</li>
                    <li><strong>Chapter 4 — Results &amp; Discussion:</strong> Present findings objectively with tables/charts; interpret and connect to literature.</li>
                    <li><strong>Chapter 5 — Conclusion &amp; Recommendations:</strong> Summarise key findings, limitations, and suggestions for future work.</li>
                    <li><strong>References:</strong> All sources cited using APA / IEEE / Vancouver (confirm with your institution).</li>
                    <li><strong>Appendices:</strong> Raw data, questionnaires, code snippets, ethics approval letters.</li>
                  </ol>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <p style={{ margin: 0, padding: '0.75rem 1rem', background: 'rgba(42,124,117,0.07)', borderLeft: '3px solid #2A7C75', borderRadius: '0 4px 4px 0', fontSize: '0.8rem' }}>
                    A well-written proposal is the foundation of Chapter One of your final project write-up.
                  </p>
                  <ol style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li><strong>Title:</strong> A clear, concise statement of the research topic (include your name &amp; matric number).</li>
                    <li><strong>Background:</strong> Contextualise the problem comprehensively — this section may include some initial literature review.</li>
                    <li><strong>Problem Statement:</strong> Precisely define the specific issue the research will address.</li>
                    <li><strong>Aim &amp; Objectives (Milestones):</strong> State the overall aim and break it into measurable objectives.</li>
                    <li><strong>Methodology:</strong> Describe the research design with an illustrative model/architecture diagram.</li>
                    <li><strong>Tools &amp; Hardware:</strong> List all software, algorithms, hardware components, or datasets to be used.</li>
                    <li><strong>Assumptions:</strong> State any simplifying assumptions made in the study (if applicable).</li>
                    <li><strong>Justification:</strong> Explain the significance and societal/academic impact of the project.</li>
                    <li><strong>References:</strong> List all cited works using standard academic formatting (APA, IEEE, etc.).</li>
                  </ol>
                  <div>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Useful Resources</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyleType: 'disc' }}>
                      <li><a href="https://scholar.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Google Scholar</a> — Find background literature</li>
                      <li><a href="https://www.mendeley.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Mendeley</a> — Reference manager &amp; citation formatter</li>
                      <li><a href="https://www.zotero.org" target="_blank" rel="noopener noreferrer" style={{ color: '#2A7C75' }}>Zotero</a> — Free citation &amp; bibliography tool</li>
                    </ul>
                  </div>
                </div>
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
