import type { Metadata } from 'next';
import ThemeInit from '@/components/ThemeInit';
import ThemeSync from '@/components/ThemeSync';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blackline — The AI Operating System for Property Investors',
  description:
    'Blackline empowers property investors to discover, evaluate, acquire and manage investments through intelligent automation, financial modelling and AI — turning fragmented research into confident decisions.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is scoped to this element's own attributes
    // only (it does not suppress mismatches in children) — needed because
    // ThemeInit's blocking script legitimately sets data-theme on <html>
    // before React hydrates, using a value (localStorage) the server has no
    // way to know. Without this, React treats that correct, intentional
    // difference as a hydration error. See the "no flash of wrong theme"
    // note in ThemeInit.tsx.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must run before first paint — see components/ThemeInit.tsx */}
        <ThemeInit />
      </head>
      <body>
        <AuthProvider>
          {children}
          {/* Cross-tab / bfcache theme resync — see components/ThemeSync.tsx */}
          <ThemeSync />
        </AuthProvider>
      </body>
    </html>
  );
}
