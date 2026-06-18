// src/app/projects/layout.tsx
// Wraps all /projects/* pages in the dashboard shell (sidebar + topbar + auth guard)

import type { ReactNode } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
