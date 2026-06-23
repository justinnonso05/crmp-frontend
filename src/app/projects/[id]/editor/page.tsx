'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import 'quill/dist/quill.snow.css';
import { getSocket } from '@/lib/socket';
import { apiFetch, getUser } from '@/lib/api';
import { DOCUMENTS } from '@/lib/endpoints';
import Link from 'next/link';

// Register the cursors module safely
if (!Quill.imports['modules/cursors']) {
  Quill.register('modules/cursors', QuillCursors);
}

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
  const quillRef = useRef<Quill | null>(null);
  const cursorsRef = useRef<QuillCursors | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
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
        const d = await apiFetch<{ document: Document }>(DOCUMENTS.DETAIL(documentId));
        setDoc(d.document);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId]);

  // Setup Quill and WebSockets
  useEffect(() => {
    if (loading || error || !doc || !currentUser || !documentId || !editorRef.current) return;

    // 1. Initialize Quill
    if (!quillRef.current) {
      const quill = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          cursors: true,
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'code-block'],
            ['clean'],
          ],
        },
      });
      quillRef.current = quill;
      cursorsRef.current = quill.getModule('cursors') as QuillCursors;

      // Set initial content if it exists
      if (doc.content) {
        quill.setContents(doc.content);
      }
    }

    const quill = quillRef.current;
    const cursors = cursorsRef.current;
    const socket = getSocket();
    socket.connect();

    // 2. Join the document room
    const joinRoom = () => socket.emit('join-document', documentId, currentUser.id);
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
          userId: currentUser.id,
          name: currentUser.firstName,
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
      } catch (e) {
        // cursor might already exist, safe to ignore
      }
      cursors.moveCursor(data.userId, data.range);
    };
    socket.on('cursor-update', handleCursorUpdate);

    // 6. Handle users leaving
    const handleUserLeft = (data: { userId: string }) => {
      cursors?.removeCursor(data.userId);
    };
    socket.on('user-left', handleUserLeft);

    // Cleanup
    return () => {
      quill.off('text-change', handleTextChange);
      quill.off('selection-change', handleSelectionChange);
      socket.off('connect', joinRoom);
      socket.off('receive-changes', handleReceiveChanges);
      socket.off('cursor-update', handleCursorUpdate);
      socket.off('user-left', handleUserLeft);
      socket.emit('leave-document', documentId, currentUser.id);
      socket.disconnect();
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
          <button onClick={exportToDoc} className="dash-btn-primary editor-export-btn">
            <span className="export-text-full">Export to .doc</span>
            <span className="export-text-mobile">Export</span>
          </button>
        </div>
      </header>

      {/* Editor Container */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '900px', backgroundColor: 'var(--bg)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div ref={editorRef} style={{ flex: 1, minHeight: '600px', border: 'none' }} />
        </div>
      </main>

      {/* Global CSS overrides for Quill to match our theme */}
      <style dangerouslySetInnerHTML={{__html: `
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid rgba(0,0,0,0.1) !important;
          background: rgba(255,255,255,0.5);
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
          .editor-header { padding: 1rem 0.5rem; align-items: flex-start; }
          .editor-header-left { gap: 0.5rem; }
          .editor-header-right { flex-direction: column-reverse; align-items: flex-end; gap: 0.2rem; }
          .export-text-full { display: none; }
          .export-text-mobile { display: inline; }
          .editor-title { font-size: 1rem; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        }
      `}} />
    </div>
  );
}
