// src/app/(auth)/layout.tsx
// Shared layout for login & register — minimal shell with the logo.

import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      {/* Top-left wordmark */}
      <Link href="/" className="auth-wordmark">
        Research<sup>hub</sup>
      </Link>
      {children}
    </div>
  );
}
