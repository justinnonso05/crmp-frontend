'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getToken, getUser } from '@/lib/api';
import { PROJECTS, ACTIVITIES } from '@/lib/endpoints';
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
  const [activity, setActivity]       = useState<ActivityItem[]>([]);
  const [showModal, setShowModal]     = useState(false);
  const [newTitle, setNewTitle]       = useState('');
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
    if (!newTitle.trim() || !newDesc.trim()) {
      setCreateError('Title and description are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const data = await apiFetch<{ project: Project }>(PROJECTS.CREATE, {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() }),
      });
      // Navigate directly to the new project workspace
      router.push(`/projects/${data.project.id}`);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Could not create project.');
    } finally {
      setCreating(false);
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
          <div className="dash-section-head">
            <h2 className="dash-section-title">Your projects</h2>
            <span className="dash-section-count">{projects.length}</span>
          </div>

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
                  placeholder="e.g. Climate Adaptation in West Africa"
                  value={newTitle}
                  onChange={e => { setNewTitle(e.target.value); setCreateError(''); }}
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
