'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getToken, getUser } from '@/lib/api';
import { PROJECTS, ACTIVITIES, DISCOVERY } from '@/lib/endpoints';
import { getSocket } from '@/lib/socket';

/* ── Types ──────────────────────────────────────────────────────── */
interface Member {
  userId: string;
  role: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}
interface Project {
  id: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  ethicalClearanceStatus: string;
  createdAt: string;
  members: Member[];
}
interface ActivityItem {
  id: string;
  projectId: string;
  activityType: string;
  message: string;
  initiatorId?: string;
  targetId?: string;
  metadata?: any;
  createdAt: string;
}
interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  university?: string;
}

interface DiscoverProject {
  id: string;
  title: string;
  researchTopic: string;
  description: string;
  status: string;
  createdAt: string;
  members: { user: { firstName: string; lastName: string; faculty?: string } }[];
  applications?: { id: string; status: string; role: string }[];
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Active',    cls: 'badge--active'    },
  COMPLETED: { label: 'Completed', cls: 'badge--completed' },
  ARCHIVED:  { label: 'Archived',  cls: 'badge--archived'  },
};

const ETHICS_META: Record<string, string> = {
  PENDING:  '◌ Pending',
  APPROVED: '✓ Approved',
  REJECTED: '✗ Rejected',
  EXEMPT:   '— Exempt',
};

/* ── Helpers ────────────────────────────────────────────────────── */
function formatActivityMessage(item: ActivityItem, currentUser: CurrentUser | null): string {
  if (!currentUser) return item.message;

  const isMeInitiator = currentUser.id === item.initiatorId;
  const isMeTarget = currentUser.id === item.targetId;
  const initName = item.metadata?.initiatorName || 'Someone';

  switch (item.activityType) {
    case 'MEMBER_ADDED': {
      if (isMeTarget) return `You were added to the project as ${item.metadata?.role || 'a member'}`;
      if (isMeInitiator) return `You added ${item.metadata?.targetName || 'a member'} as ${item.metadata?.role || 'a member'}`;
      return `${initName} added ${item.metadata?.targetName || 'a member'} as ${item.metadata?.role || 'a member'}`;
    }
    case 'MEMBER_REMOVED': {
      if (isMeTarget) return `You were removed from the project`;
      if (isMeInitiator) return `You removed ${item.metadata?.targetName || 'a member'}`;
      return `${initName} removed ${item.metadata?.targetName || 'a member'}`;
    }
    case 'TASK_CREATED': {
      if (isMeInitiator) return `You added the task "${item.metadata?.taskTitle}"`;
      if (isMeTarget) return `${initName} assigned you the task "${item.metadata?.taskTitle}"`;
      return `${initName} added the task "${item.metadata?.taskTitle}"`;
    }
    case 'TASK_COMPLETED': {
      if (isMeInitiator) return `You completed the task "${item.metadata?.taskTitle}"`;
      return `${initName} completed the task "${item.metadata?.taskTitle}"`;
    }
    case 'DOC_CREATED': {
      if (isMeInitiator) return `You created the document "${item.metadata?.docTitle}"`;
      return `${initName} created the document "${item.metadata?.docTitle}"`;
    }
    case 'OUTPUT_LOGGED': {
      if (isMeInitiator) return `You logged a research output "${item.metadata?.outputTitle?.substring(0, 30)}..."`;
      return `${initName} logged a research output "${item.metadata?.outputTitle?.substring(0, 30)}..."`;
    }
    default:
      return item.message;
  }
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();

  // ⚠️  MUST be null on first render so SSR and client match.
  // Populated in useEffect (client-only) to avoid hydration mismatch.
  const [currentUser, setCurrentUser]     = useState<CurrentUser | null>(null);
  const [greet, setGreet]                 = useState('');

  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  
  // Discovery State
  const [activeTab, setActiveTab]     = useState<'MY_PROJECTS' | 'DISCOVER'>('MY_PROJECTS');
  const [discoverProjects, setDiscoverProjects] = useState<DiscoverProject[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [applyingTo, setApplyingTo]   = useState<string | null>(null);
  const [appMessage, setAppMessage]   = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  const [activity, setActivity]       = useState<ActivityItem[]>([]);
  const [showModal, setShowModal]     = useState(false);
  
  // Create Project State
  const [newTitle, setNewTitle]       = useState('');
  const [newResearchTopic, setNewResearchTopic] = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState('');
  
  const activityEndRef                = useRef<HTMLDivElement>(null);

  /* ── Populate client-only values after mount ── */
  useEffect(() => {
    const u = getUser<CurrentUser>();
    setCurrentUser(u);
    setGreet(greeting());          // greeting() uses Date — client only
  }, []);

  /* ── Auth guard ── */
  useEffect(() => {
    if (currentUser === null && !getToken()) {
      router.replace('/login');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch projects ── */
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ projects: Project[] }>(PROJECTS.LIST);
        setProjects(data.projects);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load projects.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Fetch discovery projects ── */
  useEffect(() => {
    if (activeTab === 'DISCOVER') {
      setDiscoverLoading(true);
      apiFetch<DiscoverProject[]>(DISCOVERY.UNIVERSITY)
        .then(data => setDiscoverProjects(data))
        .catch(console.error)
        .finally(() => setDiscoverLoading(false));
    }
  }, [activeTab]);

  /* ── Fetch recent activities ── */
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<ActivityItem[]>(ACTIVITIES.RECENT);
        setActivity(data);
      } catch {
        // silent
      }
    })();
  }, []);

  /* ── Socket: join all project rooms & listen for activity ── */
  useEffect(() => {
    if (!projects.length || !currentUser) return;
    const socket = getSocket();
    socket.connect();

    const joinRooms = () => {
      projects.forEach(p => {
        socket.emit('join-project', p.id, currentUser.id);
      });
    };

    if (socket.connected) {
      joinRooms();
    }
    socket.on('connect', joinRooms);

    const handler = (payload: ActivityItem) => {
      setActivity(prev => [payload, ...prev].slice(0, 50));
    };

    socket.on('receive-activity', handler);

    return () => {
      projects.forEach(p => socket.emit('leave-project', p.id, currentUser.id));
      socket.off('connect', joinRooms);
      socket.off('receive-activity', handler);
      socket.disconnect();
    };
  }, [projects, currentUser]);

  /* ── Create project ── */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newResearchTopic.trim() || !newDesc.trim()) {
      setCreateError('Title, research topic, and description are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const data = await apiFetch<{ project: Project }>(PROJECTS.CREATE, {
        method: 'POST',
        body: JSON.stringify({ 
          title: newTitle.trim(), 
          researchTopic: newResearchTopic.trim(), 
          description: newDesc.trim() 
        }),
      });
      // Navigate directly to the new project workspace
      router.push(`/projects/${data.project.id}`);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Could not create project.');
    } finally {
      setCreating(false);
    }
  }

  async function handleApply(projectId: string, role: string) {
    setApplyingTo(projectId);
    try {
      const response = await apiFetch<{ application: { id: string; status: string; role: string } }>(DISCOVERY.APPLY(projectId), {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      setAppMessage({ title: 'Application Sent', desc: 'Application sent successfully! Wait for the PI to approve it.', type: 'success' });
      
      // Instantly update UI to show pending
      setDiscoverProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return { ...p, applications: [{ id: response.application.id, status: response.application.status, role: response.application.role }] };
        }
        return p;
      }));
    } catch (err: any) {
      setAppMessage({ title: 'Application Failed', desc: err.message || 'Failed to apply.', type: 'error' });
    } finally {
      setApplyingTo(null);
    }
  }

  const userRole = (project: Project) =>
    project.members.find(m => m.userId === currentUser?.id)?.role ?? '';

  const isPi = (project: Project) => userRole(project) === 'PI';

  /* ── Render ── */
  return (
    <div className="dash-page">

      {/* ── Page header ── */}
      <div className="dash-header">
        <div>
          <p className="dash-eyebrow">Research workspace</p>
          <h1 className="dash-title">
            Good {greet},{' '}
            <span className="dash-title-name">{currentUser?.firstName ?? 'Researcher'}</span>
          </h1>
        </div>
        <button className="dash-btn-primary" onClick={() => setShowModal(true)}>
          + New project
        </button>
      </div>

      {/* ── Body: two columns ── */}
      <div className="dash-body">

        {/* Projects column */}
        <section className="dash-projects-col">
          <div className="dash-section-head flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveTab('MY_PROJECTS')}
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: activeTab === 'MY_PROJECTS' ? '#1A1A18' : 'rgba(26,26,24,0.4)',
                  borderBottom: activeTab === 'MY_PROJECTS' ? '2px solid #2A7C75' : '2px solid transparent',
                  paddingBottom: '2px',
                  transition: 'color 0.2s, border-color 0.2s',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Your projects <span className="dash-section-count ml-2">{projects.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('DISCOVER')}
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: activeTab === 'DISCOVER' ? '#1A1A18' : 'rgba(26,26,24,0.4)',
                  borderBottom: activeTab === 'DISCOVER' ? '2px solid #2A7C75' : '2px solid transparent',
                  paddingBottom: '2px',
                  transition: 'color 0.2s, border-color 0.2s',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Discover
              </button>
            </div>
          </div>

          {activeTab === 'MY_PROJECTS' && (
            <>

          {loading && (
            <div className="dash-empty">
              <span className="dash-empty-icon">◌</span>
              <p>Loading projects…</p>
            </div>
          )}

          {!loading && error && (
            <div className="dash-error-box">{error}</div>
          )}

          {!loading && !error && projects.length === 0 && (
            <div className="dash-empty">
              <span className="dash-empty-icon">◈</span>
              <p>No projects yet. Create your first research project.</p>
              <button className="dash-btn-ghost" onClick={() => setShowModal(true)}>
                + New project
              </button>
            </div>
          )}

          <div className="dash-project-grid">
            {projects.map(p => (
              <Link href={`/projects/${p.id}`} key={p.id} className="proj-card">
                {/* Status + ethics row */}
                <div className="proj-card-meta">
                  <span className={`proj-badge ${STATUS_META[p.status]?.cls}`}>
                    {STATUS_META[p.status]?.label}
                  </span>
                  <span className="proj-ethics">
                    {ETHICS_META[p.ethicalClearanceStatus] ?? p.ethicalClearanceStatus}
                  </span>
                </div>

                <h3 className="proj-card-title">{p.title}</h3>
                <p className="proj-card-desc">{p.description}</p>

                {/* Footer: role + member count */}
                <div className="proj-card-foot">
                  <span className="proj-role">{roleLabel(userRole(p))}</span>
                  <span className="proj-members">
                    {p.members.length} member{p.members.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* PI-only indicator */}
                {isPi(p) && <div className="proj-pi-bar" />}
              </Link>
            ))}
          </div>
              </>
          )}

          {/* DISCOVERY TAB CONTENT */}
          {activeTab === 'DISCOVER' && (
            <>
              {discoverLoading && (
                <div className="dash-empty">
                  <span className="dash-empty-icon animate-spin">◌</span>
                  <p>Discovering projects at your university…</p>
                </div>
              )}

              {!discoverLoading && discoverProjects.length === 0 && (
                <div className="dash-empty">
                  <span className="dash-empty-icon">◈</span>
                  <p>No public projects found at your university yet.</p>
                </div>
              )}

              {!discoverLoading && discoverProjects.length > 0 && (
                <div className="dash-project-grid">
                  {discoverProjects.map(p => (
                    <div key={p.id} className="proj-card">
                      {/* teal top bar */}
                      <div className="proj-pi-bar" />

                      {/* Status + date */}
                      <div className="proj-card-meta">
                        <span className={`proj-badge ${STATUS_META[p.status]?.cls || 'badge--active'}`}>
                          {STATUS_META[p.status]?.label || p.status}
                        </span>
                        <span className="proj-ethics">
                          {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Title + topic + desc */}
                      <h3 className="proj-card-title">{p.title}</h3>

                      {/* Footer: PI info + apply */}
                      <div className="proj-card-foot" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
                        {p.members[0] && (
                          <span className="proj-ethics">
                            PI · {p.members[0].user.firstName} {p.members[0].user.lastName}
                          </span>
                        )}


                        {projects.some(myProj => myProj.id === p.id) ? (
                          <Link href={`/projects/${p.id}`} className="dash-btn-ghost" style={{ width: '100%', textAlign: 'center', background: 'rgba(42,124,117,0.05)', color: '#2A7C75', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            Open workspace →
                          </Link>
                        ) : p.applications && p.applications.length > 0 ? (
                          <div style={{ width: '100%', textAlign: 'center', background: 'rgba(26,26,24,0.05)', color: 'rgba(26,26,24,0.6)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            Pending Request: {p.applications[0].role.replace('_', ' ')}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <select
                              id={`role-${p.id}`}
                              className="auth-input auth-select"
                              defaultValue="CO_INVESTIGATOR"
                              style={{ flex: 1, fontSize: '0.72rem', padding: '0.35rem 0.6rem', minWidth: 0 }}
                            >
                              <option value="CO_INVESTIGATOR">Co-Investigator</option>
                              <option value="ASSISTANT">Research Assistant</option>
                              <option value="REVIEWER">Reviewer</option>
                            </select>
                            <button
                              className="dash-btn-primary"
                              style={{ padding: '0.35rem 0.9rem', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                              onClick={() => {
                                const role = (document.getElementById(`role-${p.id}`) as HTMLSelectElement).value;
                                handleApply(p.id, role);
                              }}
                              disabled={applyingTo === p.id}
                            >
                              {applyingTo === p.id ? 'Applying…' : 'Apply'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </section>

        {/* Activity feed column */}
        <aside className="dash-activity-col">
          <div className="dash-section-head">
            <h2 className="dash-section-title">Live activity</h2>
            <span className="dash-live-dot" title="Connected" />
          </div>

          {activity.length === 0 ? (
            <div className="dash-empty dash-empty--sm">
              <p>Activity from your projects will appear here in real time.</p>
            </div>
          ) : (
            <ul className="activity-list">
              {activity.map(item => (
                <li key={item.id} className="activity-item">
                  <span className="activity-type">{item.activityType}</span>
                  <p className="activity-msg">{formatActivityMessage(item, currentUser)}</p>
                  <span className="activity-time">{formatTime(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <div ref={activityEndRef} />
        </aside>
      </div>

      {/* ── Create Project Modal ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <p className="auth-eyebrow">New research project</p>
              <h2 className="modal-title">Create project</h2>
            </div>
            <form onSubmit={handleCreate} className="auth-form">
              <div className="auth-field">
                <label className="auth-label" htmlFor="proj-title">Project title</label>
                <input
                  id="proj-title"
                  className="auth-input"
                  type="text"
                  placeholder="e.g. Collaborative Research Management Platform"
                  value={newTitle}
                  onChange={e => { setNewTitle(e.target.value); setCreateError(''); }}
                  disabled={creating}
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="proj-topic">Research topic</label>
                <input
                  id="proj-topic"
                  className="auth-input"
                  type="text"
                  placeholder="e.g. Development of a collaborative research management platform"
                  value={newResearchTopic}
                  onChange={e => { setNewResearchTopic(e.target.value); setCreateError(''); }}
                  disabled={creating}
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="proj-desc">Description</label>
                <textarea
                  id="proj-desc"
                  className="auth-input auth-textarea"
                  placeholder="Brief overview of the research objectives…"
                  rows={4}
                  value={newDesc}
                  onChange={e => { setNewDesc(e.target.value); setCreateError(''); }}
                  disabled={creating}
                />
              </div>
              <p className="auth-role-note">
                You will automatically be assigned as <strong>Principal Investigator</strong> of this project.
              </p>
              {createError && <p className="auth-error">{createError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="dash-btn-ghost"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button type="submit" className="dash-btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create project →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application Message Modal */}
      {appMessage && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: appMessage.type === 'error' ? 'var(--error)' : 'inherit' }}>{appMessage.title}</h2>
            </div>
            <div className="auth-form">
              <p style={{ color: 'rgba(26,26,24,0.7)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                {appMessage.desc}
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="dash-btn-primary"
                  onClick={() => setAppMessage(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return '';
  }
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    PI:               'Principal Investigator',
    CO_INVESTIGATOR:  'Co-Investigator',
    ASSISTANT:        'Research Assistant',
    REVIEWER:         'Reviewer',
  };
  return map[role] ?? role;
}
