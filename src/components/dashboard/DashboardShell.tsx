'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, getUser, removeToken } from '@/lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: '◈' },
  { href: '/settings',   label: 'Settings',   icon: '◎' },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]           = useState<User | null>(null);
  const [sideOpen, setSideOpen]   = useState(false);

  /* ── Auth guard ── */
  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    const u = getUser<User>();
    setUser(u);
  }, [router]);

  function handleSignOut() {
    removeToken();
    router.replace('/login');
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  return (
    <div className="ds-root">
      {/* ── Sidebar ── */}
      <aside className={`ds-sidebar ${sideOpen ? 'ds-sidebar--open' : ''}`}>
        <Link href="/" className="ds-logo">
          Research<sup>hub</sup>
        </Link>

        <nav className="ds-nav">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`ds-nav-item ${pathname === href ? 'ds-nav-item--active' : ''}`}
            >
              <span className="ds-nav-icon">{icon}</span>
              <span className="ds-nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        <button className="ds-signout" onClick={handleSignOut}>
          <span className="ds-nav-icon">→</span>
          <span className="ds-nav-label">Sign out</span>
        </button>
      </aside>

      {/* ── Mobile overlay ── */}
      {sideOpen && (
        <div className="ds-overlay" onClick={() => setSideOpen(false)} />
      )}

      {/* ── Main content ── */}
      <div className="ds-main">
        {/* Topbar */}
        <header className="ds-topbar">
          <button
            className="ds-hamburger"
            onClick={() => setSideOpen(s => !s)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="ds-topbar-right">
            {user && (
              <div className="ds-avatar" title={`${user.firstName} ${user.lastName}`}>
                {initials}
              </div>
            )}
          </div>
        </header>

        <main className="ds-content">
          {children}
        </main>
      </div>
    </div>
  );
}
