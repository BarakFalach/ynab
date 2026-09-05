import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'YNAB Script',
  description: 'Manage YNAB automation scripts and settings',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/overrides">Card overrides</Link>
          <Link href="/bank-rules">Bank rules</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
