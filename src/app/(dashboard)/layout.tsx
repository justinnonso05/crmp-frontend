// src/app/(dashboard)/layout.tsx
// Shared shell for all authenticated dashboard pages.
// Handles auth guard + sidebar nav.

import type { ReactNode } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
