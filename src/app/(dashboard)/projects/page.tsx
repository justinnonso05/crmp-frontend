'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getToken, getUser } from '@/lib/api';
import { PROJECTS } from '@/lib/endpoints';

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

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Active',    cls: 'badge--active' },
  COMPLETED: { label: 'Completed', cls: 'badge--completed' },
  ARCHIVED:  { label: 'Archived',  cls: 'badge--archived' },
};

const ETHICS_META: Record<string, string> = {
  PENDING:  'Pending Ethics',
  APPROVED: 'Ethics Approved',
  REJECTED: 'Ethics Rejected',
  EXEMPT:   'Ethics Exempt',
};

const ROLE_LABELS: Record<string, string> = {
  PI: 'Principal Investigator',
  CO_INVESTIGATOR: 'Co-Investigator',
  ASSISTANT: 'Research Assistant',
  REVIEWER: 'Reviewer',
};

export default function AllProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getUser<{ id: string }>();
    if (!getToken() || !user) { router.replace('/login'); return; }
    setCurrentUser(user);
    
    (async () => {
      try {
        const pRes = await apiFetch<{ projects: Project[] }>(PROJECTS.LIST);
        setProjects(pRes.projects);
      } catch (err: any) {
        setError(err.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <div className="dash-empty">Loading projects...</div>;
  if (error) return <div className="dash-empty" style={{ color: 'var(--error)' }}>{error}</div>;

  return (
    <div className="dash-container">
      <header className="dash-header">
        <div>
          <h1 className="proj-title">All Projects</h1>
          <p className="proj-desc">A complete list of all your research workspaces.</p>
        </div>
      </header>
      
      {projects.length === 0 ? (
        <div className="dash-empty">
          <span className="dash-empty-icon">▤</span>
          <p>You have no projects yet.</p>
        </div>
      ) : (
        <div className="dash-project-grid">
          {projects.map(p => {
            const myMember = p.members.find(m => m.userId === currentUser?.id);
            const role = myMember ? ROLE_LABELS[myMember.role] || myMember.role : 'Member';
            
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="proj-card">
                <div className="proj-card-meta">
                  <span className={`proj-badge ${STATUS_META[p.status]?.cls}`}>
                    {STATUS_META[p.status]?.label}
                  </span>
                </div>
                
                <h3 className="proj-card-title">{p.title}</h3>
                <p className="proj-card-desc">{p.description}</p>
                
                <div className="proj-card-foot">
                  <span className="proj-role">{role}</span>
                  <span className="proj-members">
                    {p.members.length} member{p.members.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {myMember?.role === 'PI' && <div className="proj-pi-bar" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
