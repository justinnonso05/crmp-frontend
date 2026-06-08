import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Research Hub — Collaborative Research Management Platform',
  description:
    'A unified, purpose-built workspace for the full academic research lifecycle. Manage projects, collaborate in real time, build surveys, and log research outputs — all in one place.',
  keywords: ['research management', 'academic collaboration', 'CRMP', 'real-time editor'],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Anton&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Instrument+Serif:ital@0;1&family=Bebas+Neue&family=DM+Mono:wght@300;400&display=swap"
          rel="stylesheet"
        />
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
