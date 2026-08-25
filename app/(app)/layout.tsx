'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth';

// /analyse deliberately stays reachable without an account — running an
// analysis is the Free-tier entry point (per the business plan's "five
// free analyses/day"), and the backend's /api/analyze route itself has no
// auth requirement either. Saving a result / recording history / adding to
// a watchlist from that page still requires being logged in, handled at
// the point of that action rather than by blocking the whole page.
// Every other app-shell page (history, saved, portfolio, account) shows
// data that only makes sense for a signed-in user, so those redirect to
// /login if there's no session.
const PUBLIC_APP_PATHS = ['/analyse'];

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPath = PUBLIC_APP_PATHS.some((p) => pathname === p || pathname?.startsWith(`${p}/`));

  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/analyse')}`);
    }
  }, [loading, user, isPublicPath, pathname, router]);

  // Avoid a flash of a protected page's content before the redirect kicks
  // in — render nothing (not even the shell) while we don't yet know if
  // there's a session, or once we know there isn't one and a protected
  // page was requested.
  if (!isPublicPath && (loading || !user)) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
