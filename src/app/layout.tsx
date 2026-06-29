import type { Metadata } from 'next';
import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://crmp.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'CRMP — Collaborative Research Management Platform',
    template: '%s | CRMP',
  },
  description:
    'A unified, purpose-built workspace for the full academic research lifecycle. Manage projects, collaborate in real time, build surveys, and log research outputs — all in one place.',
  keywords: [
    'research management', 'academic collaboration', 'CRMP',
    'real-time editor', 'research platform', 'academic research',
    'collaborative research', 'research project management',
  ],
  authors: [{ name: 'CRMP Team' }],
  creator: 'CRMP',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'CRMP',
    title: 'CRMP — Collaborative Research Management Platform',
    description:
      'A unified workspace for the full academic research lifecycle — manage projects, collaborate in real time, survey participants, and publish outputs.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CRMP — Collaborative Research Management Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CRMP — Collaborative Research Management Platform',
    description:
      'A unified workspace for the full academic research lifecycle — manage projects, collaborate in real time, survey participants, and publish outputs.',
    images: ['/og-image.png'],
    creator: '@crmp_app',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#1A1A18" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Anton&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Instrument+Serif:ital@0;1&family=Bebas+Neue&family=DM+Mono:wght@300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
