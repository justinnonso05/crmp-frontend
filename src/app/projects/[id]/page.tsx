'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getUser, getToken } from '@/lib/api';
import { PROJECTS, TASKS, DOCUMENTS, SURVEYS, OUTPUTS, UPLOAD } from '@/lib/endpoints';
import { Trash2 } from 'lucide-react';
import '../../../project-mobile.css';
import { getSocket } from '@/lib/socket';
import UserSearchInput from '@/components/dashboard/UserSearchInput';

/* ─────────────────────────── Types ─────────────────────────────── */
interface UserMeta { id: string; firstName: string; lastName: string; email: string; }
interface Member   { userId: string; role: string; joinedAt: string; user: UserMeta; }
interface Task {
  id: string; title: string; dueDate: string;
  isCompleted: boolean; assignedUserId: string | null;
  assignee?: UserMeta | null;
}
interface Document { id: string; title: string; updatedAt: string; lastModifiedBy: string; }
interface Survey   { id: string; title: string; isActive: boolean; createdAt: string; }
interface Output   { id: string; outputType: string; citation: string; fileUrl?: string; createdAt: string; }
interface Project {
  id: string; title: string; description: string;
  status: string; ethicalClearanceStatus: string; createdAt: string;
  members: Member[]; tasks: Task[];
}

type Tab = 'tasks' | 'documents' | 'surveys' | 'outputs' | 'members';

const ROLE_LABELS: Record<string, string> = {
  PI: 'Principal Investigator', CO_INVESTIGATOR: 'Co-Investigator',
  ASSISTANT: 'Research Assistant', REVIEWER: 'Reviewer',
};
const ETHICS_LABELS: Record<string, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', EXEMPT: 'Exempt',
};
const OUTPUT_LABELS: Record<string, string> = {
  JOURNAL: 'Journal', CONFERENCE: 'Conference', REPORT: 'Report',
};

/* ─────────────────────────── Page ──────────────────────────────── */
export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [currentUser, setCurrentUser] = useState<UserMeta | null>(null);
  const [project, setProject]         = useState<Project | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [tab, setTab]                 = useState<Tab>('tasks');

  /* ── per-tab data ── */
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [surveys,   setSurveys]   = useState<Survey[]>([]);
  const [outputs,   setOutputs]   = useState<Output[]>([]);

  /* ── task modal ── */
  const [showTaskModal,  setShowTaskModal]  = useState(false);
  const [taskTitle,      setTaskTitle]      = useState('');
  const [taskDue,        setTaskDue]        = useState('');
  const [taskAssignee,   setTaskAssignee]   = useState('');
  const [taskErr,        setTaskErr]        = useState('');
  const [savingTask,     setSavingTask]     = useState(false);

  /* ── member modal ── */
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail,     setMemberEmail]     = useState('');
  const [memberRole,      setMemberRole]      = useState('ASSISTANT');
  const [memberErr,       setMemberErr]       = useState('');
  const [savingMember,    setSavingMember]    = useState(false);

  /* ── document modal ── */
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTitle,     setDocTitle]     = useState('');
  const [docErr,       setDocErr]       = useState('');
  const [savingDoc,    setSavingDoc]    = useState(false);

  /* ── output modal ── */
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [outType,         setOutType]         = useState('JOURNAL');
  const [outCitation,     setOutCitation]     = useState('');
  const [outFile,         setOutFile]         = useState<File | null>(null);
  const [outErr,          setOutErr]          = useState('');
  const [savingOut,       setSavingOut]       = useState(false);

  /* ── alert & confirm modals ── */
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmState, setConfirmState] = useState<{ message: string, onConfirm: () => void } | null>(null);

  /* ─── mount: auth + user ─── */
  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    setCurrentUser(getUser<UserMeta>());
  }, [router]);

  /* ─── fetch project ─── */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await apiFetch<{ project: Project }>(PROJECTS.DETAIL(id));
        setProject(d.project);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load project.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ─── fetch all tab data concurrently ─── */
  const fetchAllTabData = useCallback(() => {
    if (!id) return;
    apiFetch<{ tasks: Task[] }>(TASKS.LIST(id)).then(d => setTasks(d.tasks)).catch(console.error);
    apiFetch<{ documents: Document[] }>(DOCUMENTS.LIST(id)).then(d => setDocuments(d.documents)).catch(console.error);
    apiFetch<{ surveys: Survey[] }>(SURVEYS.LIST(id)).then(d => setSurveys(d.surveys)).catch(console.error);
    apiFetch<{ outputs: Output[] }>(OUTPUTS.LIST(id)).then(d => setOutputs(d.outputs)).catch(console.error);
  }, [id]);

  /* ─── Status Update Handlers ─── */
  async function handleUpdateStatus(newStatus: string) {
    if (!project) return;
    try {
      const d = await apiFetch<{ project: Project }>(PROJECTS.UPDATE_STATUS(id), {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setProject(d.project);
    } catch (e: any) { setAlertMessage(e.message || 'Failed to update status'); }
  }

  useEffect(() => { fetchAllTabData(); }, [fetchAllTabData]);

  /* ─── socket: join project room ─── */
  useEffect(() => {
    if (!id || !currentUser) return;
    const socket = getSocket();
    socket.connect();
    
    const joinRoom = () => socket.emit('join-project', id, currentUser.id);
    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);

    return () => { 
      socket.emit('leave-project', id, currentUser.id); 
      socket.off('connect', joinRoom);
      socket.disconnect(); 
    };
  }, [id, currentUser]);

  /* ─── derived ─── */
  const myRole    = project?.members.find(m => m.userId === currentUser?.id)?.role ?? '';
  const isPI      = myRole === 'PI';
  const canEdit   = myRole === 'PI' || myRole === 'CO_INVESTIGATOR';
  const canWrite  = canEdit || myRole === 'ASSISTANT';

  /* ─── emit activity helper ─── */
  function broadcastActivity(activityType: string, message: string, targetId?: string, metadata?: any) {
    const socket = getSocket();
    const payload = { 
      projectId: id, 
      activityType, 
      message,
      initiatorId: currentUser?.id,
      targetId,
      metadata
    };
    socket.emit('broadcast-activity', payload);
  }

  /* ─── task actions ─── */
  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDue) { setTaskErr('Title and due date are required.'); return; }
    setSavingTask(true); setTaskErr('');
    try {
      const d = await apiFetch<{ task: Task }>(TASKS.CREATE(id), {
        method: 'POST',
        body: JSON.stringify({ title: taskTitle.trim(), dueDate: taskDue, assignedUserId: taskAssignee || undefined }),
      });
      setProject(p => p ? { ...p, tasks: [...p.tasks, d.task] } : p);
      broadcastActivity('TASK_CREATED', `New task "${d.task.title}" was added`, d.task.assignedUserId || undefined, { taskTitle: d.task.title, initiatorName: currentUser?.firstName });
      setShowTaskModal(false); setTaskTitle(''); setTaskDue(''); setTaskAssignee('');
    } catch (e: unknown) { setTaskErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setSavingTask(false); }
  }

  async function toggleTask(task: Task) {
    try {
      const d = await apiFetch<{ task: Task }>(TASKS.STATUS(task.id), {
        method: 'PUT',
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      });
      setProject(p => p ? { ...p, tasks: p.tasks.map(t => t.id === task.id ? d.task : t) } : p);
      if (d.task.isCompleted) broadcastActivity('TASK_COMPLETED', `Task "${d.task.title}" marked complete`, d.task.assignedUserId || undefined, { taskTitle: d.task.title, initiatorName: currentUser?.firstName });
    } catch { /* silent */ }
  }

  /* ─── member actions ─── */
  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!memberEmail.trim()) { setMemberErr('Please search and select a user.'); return; }
    setSavingMember(true); setMemberErr('');
    try {
      await apiFetch(PROJECTS.ADD_MEMBER(id), {
        method: 'POST',
        body: JSON.stringify({ targetUserId: memberEmail, role: memberRole }),
      });
      const d = await apiFetch<{ project: Project }>(PROJECTS.DETAIL(id));
      setProject(d.project);
      const addedMember = d.project.members.find(m => m.user.id === memberEmail);
      const targetName = addedMember ? `${addedMember.user.firstName} ${addedMember.user.lastName}` : 'A user';
      broadcastActivity('MEMBER_ADDED', `A new member joined the project as ${ROLE_LABELS[memberRole]}`, memberEmail, { role: ROLE_LABELS[memberRole], targetName, initiatorName: currentUser?.firstName });
      setShowMemberModal(false); setMemberEmail(''); setMemberRole('ASSISTANT');
    } catch (e: unknown) { setMemberErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setSavingMember(false); }
  }

  async function handleRemoveMember(userId: string, userName: string) {
    setConfirmState({
      message: `Are you sure you want to remove ${userName} from the project?`,
      onConfirm: async () => {
        setConfirmState(null);
        if (!id) return;
        try {
          await apiFetch(PROJECTS.REMOVE_MEMBER(id, userId), { method: 'DELETE' });
          setProject(p => p ? { ...p, members: p.members.filter(m => m.userId !== userId) } : null);
          broadcastActivity('MEMBER_REMOVED', `${userName} was removed from the project`, userId, { targetName: userName, initiatorName: currentUser?.firstName });
        } catch (e: unknown) {
          setAlertMessage(e instanceof Error ? e.message : 'Failed to remove member.');
        }
      }
    });
  }

  /* ─── document actions ─── */
  async function createDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!docTitle.trim()) { setDocErr('Title is required.'); return; }
    setSavingDoc(true); setDocErr('');
    try {
      const d = await apiFetch<{ document: Document }>(DOCUMENTS.CREATE(id), {
        method: 'POST',
        body: JSON.stringify({ title: docTitle.trim() }),
      });
      setDocuments(prev => [d.document, ...prev]);
      broadcastActivity('DOC_CREATED', `Document "${d.document.title}" was created`, undefined, { docTitle: d.document.title, initiatorName: currentUser?.firstName });
      router.push(`/projects/${id}/editor?doc=${d.document.id}`);
    } catch (e: unknown) { setDocErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setSavingDoc(false); }
  }

  /* ─── output actions ─── */
  async function createOutput(e: React.FormEvent) {
    e.preventDefault();
    if (!outCitation.trim()) { setOutErr('Citation is required.'); return; }
    setSavingOut(true); setOutErr('');
    try {
      let fileUrl = undefined;
      if (outFile) {
        const formData = new FormData();
        formData.append('file', outFile);
        const uploadRes = await apiFetch<{ fileUrl: string }>(UPLOAD.FILE, {
          method: 'POST',
          body: formData,
        });
        fileUrl = uploadRes.fileUrl;
      }

      const d = await apiFetch<{ output: Output }>(OUTPUTS.CREATE(id), {
        method: 'POST',
        body: JSON.stringify({ outputType: outType, citation: outCitation.trim(), fileUrl }),
      });
      setOutputs(prev => [d.output, ...prev]);
      broadcastActivity('OUTPUT_LOGGED', `Output logged: ${outType}`, undefined, { outType, initiatorName: currentUser?.firstName });
      setShowOutputModal(false); setOutCitation(''); setOutFile(null); setOutType('JOURNAL');
    } catch (e: unknown) { setOutErr(e instanceof Error ? e.message : 'Failed.'); }
    finally { setSavingOut(false); }
  }

  /* ─── render guards ─── */
  if (loading) return (
    <div className="proj-loading">
      <span className="dash-empty-icon">◌</span>
      <p>Loading project…</p>
    </div>
  );
  if (error) return <div className="dash-error-box proj-error">{error}</div>;
  if (!project) return null;

  /* ─────────────────────────── JSX ───────────────────────────── */
  return (
    <div className="proj-page">

      {/* ── Breadcrumb ── */}
      <nav className="proj-breadcrumb">
        <Link href="/dashboard" className="proj-bc-link">Dashboard</Link>
        <span className="proj-bc-sep">›</span>
        <span className="proj-bc-cur">{project.title}</span>
      </nav>

      {/* ── Project header ── */}
      <div className="proj-page-header">
        <div className="proj-page-header-left">
          <div className="proj-page-badges">
            {myRole === 'PI' ? (
              <select 
                className={`proj-badge badge--${project.status.toLowerCase()}`} 
                value={project.status} 
                onChange={e => handleUpdateStatus(e.target.value)}
                style={{ padding: '0.2rem 0.5rem', cursor: 'pointer', appearance: 'auto' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            ) : (
              <span className={`proj-badge badge--${project.status.toLowerCase()}`}>{project.status}</span>
            )}
            
            <span className="proj-role-chip">{ROLE_LABELS[myRole] ?? myRole}</span>
          </div>
          <h1 className="proj-page-title">{project.title}</h1>
          <p className="proj-page-desc">{project.description}</p>
        </div>
        <div className="proj-page-header-right">
          <p className="proj-page-stat-label">Members</p>
          <p className="proj-page-stat-num">{project.members.length}</p>
          <p className="proj-page-stat-label" style={{ marginTop: '0.8rem' }}>Tasks</p>
          <p className="proj-page-stat-num">{project.tasks.length}</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="proj-tabs">
        {(['tasks', 'documents', 'surveys', 'outputs', 'members'] as Tab[]).map(t => (
          <button
            key={t}
            className={`proj-tab ${tab === t ? 'proj-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="proj-tab-content">

        {/* ════ TASKS ════ */}
        {tab === 'tasks' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Tasks &amp; Milestones</h2>
              {canEdit && (
                <button className="dash-btn-primary" onClick={() => setShowTaskModal(true)}>
                  + Add task
                </button>
              )}
            </div>
            {project.tasks.length === 0 ? (
              <div className="dash-empty"><span className="dash-empty-icon">◌</span><p>No tasks yet.</p></div>
            ) : (
              <ul className="task-list">
                {project.tasks.map(task => (
                  <li key={task.id} className={`task-item ${task.isCompleted ? 'task-item--done' : ''}`}>
                    <button
                      className="task-check"
                      onClick={() => toggleTask(task)}
                      aria-label={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {task.isCompleted ? '✓' : '○'}
                    </button>
                    <div className="task-info">
                      <span className="task-title">{task.title}</span>
                      <span className="task-due">Due {formatDate(task.dueDate)}</span>
                    </div>
                    {task.assignee && (
                      <span className="task-assignee">
                        {task.assignee.firstName} {task.assignee.lastName}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ════ DOCUMENTS ════ */}
        {tab === 'documents' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Documents</h2>
              {canWrite && (
                <button className="dash-btn-primary" onClick={() => setShowDocModal(true)}>
                  + New document
                </button>
              )}
            </div>
            {documents.length === 0 ? (
              <div className="dash-empty"><span className="dash-empty-icon">◈</span><p>No documents yet.</p></div>
            ) : (
              <ul className="doc-list">
                {documents.map(doc => (
                  <li key={doc.id} className="doc-item">
                    <div className="doc-item-info">
                      <span className="doc-item-title">{doc.title}</span>
                      <span className="doc-item-meta">Last edited {formatDateTime(doc.updatedAt)}</span>
                    </div>
                    <Link
                      href={`/projects/${id}/editor?doc=${doc.id}`}
                      className="dash-btn-ghost doc-open-btn"
                    >
                      Open →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ════ SURVEYS ════ */}
        {tab === 'surveys' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Surveys</h2>
              {canEdit && (
                <Link href={`/projects/${id}/surveys`} className="dash-btn-primary">
                  + Build survey
                </Link>
              )}
            </div>
            {surveys.length === 0 ? (
              <div className="dash-empty"><span className="dash-empty-icon">◌</span><p>No surveys yet.</p></div>
            ) : (
              <ul className="doc-list">
                {surveys.map(s => (
                  <li key={s.id} className="doc-item">
                    <div className="doc-item-info">
                      <span className="doc-item-title">{s.title}</span>
                      <span className="doc-item-meta">
                        {s.isActive ? '● Active' : '○ Inactive'} · Created {formatDate(s.createdAt)}
                      </span>
                    </div>
                    <Link href={`/projects/${id}/surveys?survey=${s.id}`} className="dash-btn-ghost doc-open-btn">
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ════ OUTPUTS ════ */}
        {tab === 'outputs' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Research Outputs</h2>
              {canWrite && (
                <button className="dash-btn-primary" onClick={() => setShowOutputModal(true)}>
                  + Log output
                </button>
              )}
            </div>
            {outputs.length === 0 ? (
              <div className="dash-empty"><span className="dash-empty-icon">◈</span><p>No outputs logged yet.</p></div>
            ) : (
              <ul className="doc-list">
                {outputs.map(o => (
                  <li key={o.id} className="doc-item">
                    <div className="doc-item-info">
                      <span className="proj-badge badge--active" style={{ marginBottom: '0.3rem', display: 'inline-block' }}>
                        {OUTPUT_LABELS[o.outputType] ?? o.outputType}
                      </span>
                      <span className="doc-item-title">{o.citation}</span>
                      <span className="doc-item-meta">Logged {formatDate(o.createdAt)}</span>
                    </div>
                    {o.fileUrl && (
                      <a href={o.fileUrl} target="_blank" rel="noopener" className="dash-btn-ghost doc-open-btn">
                        File →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ════ MEMBERS ════ */}
        {tab === 'members' && (
          <div>
            <div className="proj-tab-head">
              <h2 className="proj-tab-title">Team Members</h2>
              {isPI && (
                <button className="dash-btn-primary" onClick={() => setShowMemberModal(true)}>
                  + Add member
                </button>
              )}
            </div>
            <ul className="member-list">
              {project.members.map(m => (
                <li key={m.userId} className="member-item">
                  <div className="member-avatar">
                    {m.user.firstName[0]}{m.user.lastName[0]}
                  </div>
                  <div className="member-info">
                    <span className="member-name">{m.user.firstName} {m.user.lastName}</span>
                    <span className="member-email">{m.user.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="member-item-actions">
                    <span className="member-role">{ROLE_LABELS[m.role] ?? m.role}</span>
                    {isPI && m.userId !== currentUser?.id && (
                      <button 
                        onClick={() => handleRemoveMember(m.userId, `${m.user.firstName} ${m.user.lastName}`)}
                        className="dash-btn-ghost" 
                        style={{ color: 'var(--error)', padding: '0.25rem 0.5rem' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ════ MODALS ════ */}

      {/* Task modal */}
      {showTaskModal && (
        <Modal title="Add task" onClose={() => setShowTaskModal(false)}>
          <form onSubmit={createTask} className="auth-form">
            <Field label="Task title" id="task-title">
              <input id="task-title" className="auth-input" type="text"
                placeholder="e.g. Complete literature review"
                value={taskTitle} onChange={e => { setTaskTitle(e.target.value); setTaskErr(''); }}
                disabled={savingTask} />
            </Field>
            <Field label="Due date" id="task-due">
              <input id="task-due" className="auth-input" type="date"
                value={taskDue} onChange={e => { setTaskDue(e.target.value); setTaskErr(''); }}
                disabled={savingTask} />
            </Field>
            <Field label="Assign to (Search by email — optional)" id="task-assignee">
              <UserSearchInput
                id="task-assignee"
                value={taskAssignee}
                onChange={setTaskAssignee}
                disabled={savingTask}
              />
            </Field>
            {taskErr && <p className="auth-error">{taskErr}</p>}
            <ModalActions>
              <button type="button" className="dash-btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button type="submit" className="dash-btn-primary" disabled={savingTask}>
                {savingTask ? 'Saving…' : 'Add task →'}
              </button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* Member modal */}
      {showMemberModal && (
        <Modal title="Add member" onClose={() => setShowMemberModal(false)}>
          <form onSubmit={addMember} className="auth-form">
            <Field label="Search user by email" id="member-id">
              <UserSearchInput
                id="member-id"
                value={memberEmail}
                onChange={(val) => { setMemberEmail(val); setMemberErr(''); }}
                disabled={savingMember}
              />
            </Field>
            <Field label="Role" id="member-role">
              <select id="member-role" className="auth-input auth-select"
                value={memberRole} onChange={e => setMemberRole(e.target.value)}
                disabled={savingMember}>
                <option value="CO_INVESTIGATOR">Co-Investigator</option>
                <option value="ASSISTANT">Research Assistant</option>
                <option value="REVIEWER">Reviewer</option>
              </select>
            </Field>
            {memberErr && <p className="auth-error">{memberErr}</p>}
            <ModalActions>
              <button type="button" className="dash-btn-ghost" onClick={() => setShowMemberModal(false)}>Cancel</button>
              <button type="submit" className="dash-btn-primary" disabled={savingMember}>
                {savingMember ? 'Adding…' : 'Add member →'}
              </button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* Document modal */}
      {showDocModal && (
        <Modal title="New document" onClose={() => setShowDocModal(false)}>
          <form onSubmit={createDocument} className="auth-form">
            <Field label="Document title" id="doc-title">
              <input id="doc-title" className="auth-input" type="text"
                placeholder="e.g. Research Methodology Draft"
                value={docTitle} onChange={e => { setDocTitle(e.target.value); setDocErr(''); }}
                disabled={savingDoc} />
            </Field>
            {docErr && <p className="auth-error">{docErr}</p>}
            <ModalActions>
              <button type="button" className="dash-btn-ghost" onClick={() => setShowDocModal(false)}>Cancel</button>
              <button type="submit" className="dash-btn-primary" disabled={savingDoc}>
                {savingDoc ? 'Creating…' : 'Create & open →'}
              </button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* Output modal */}
      {showOutputModal && (
        <Modal title="Log research output" onClose={() => setShowOutputModal(false)}>
          <form onSubmit={createOutput} className="auth-form">
            <Field label="Output type" id="out-type">
              <select id="out-type" className="auth-input auth-select"
                value={outType} onChange={e => setOutType(e.target.value)}
                disabled={savingOut}>
                <option value="JOURNAL">Journal Article</option>
                <option value="CONFERENCE">Conference Paper</option>
                <option value="REPORT">Report</option>
              </select>
            </Field>
            <Field label="Citation / Title" id="out-cite">
              <textarea id="out-cite" className="auth-textarea"
                placeholder="Full citation or title of the output…"
                rows={3} value={outCitation}
                onChange={e => { setOutCitation(e.target.value); setOutErr(''); }}
                disabled={savingOut} />
            </Field>
            <Field label="Attach File (Optional)" id="out-file">
              <input id="out-file" className="auth-input" type="file"
                onChange={e => { setOutFile(e.target.files?.[0] || null); setOutErr(''); }}
                disabled={savingOut} />
            </Field>
            {outErr && <p className="auth-error">{outErr}</p>}
            <ModalActions>
              <button type="button" className="dash-btn-ghost" onClick={() => setShowOutputModal(false)}>Cancel</button>
              <button type="submit" className="dash-btn-primary" disabled={savingOut}>
                {savingOut ? 'Saving…' : 'Log output →'}
              </button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {/* ── Custom Alert Modal ── */}
      {alertMessage && (
        <div className="dash-modal-overlay">
          <div className="dash-modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 className="dash-modal-title" style={{ color: 'var(--error)' }}>Notice</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>{alertMessage}</p>
            <div className="dash-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="dash-btn-primary" onClick={() => setAlertMessage('')}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Confirm Modal ── */}
      {confirmState && (
        <div className="dash-modal-overlay">
          <div className="dash-modal" style={{ maxWidth: '400px' }}>
            <h3 className="dash-modal-title">Confirm Action</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>{confirmState.message}</p>
            <div className="dash-modal-actions">
              <button className="dash-btn-ghost" onClick={() => setConfirmState(null)}>
                Cancel
              </button>
              <button 
                className="dash-btn-primary" 
                onClick={confirmState.onConfirm}
                style={{ backgroundColor: 'var(--error)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Shared sub-components ────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <p className="auth-eyebrow">Project workspace</p>
          <h2 className="modal-title">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="modal-actions">{children}</div>;
}

/* ─────────────────────── Helpers ──────────────────────────────── */
function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch { return iso; }
}
