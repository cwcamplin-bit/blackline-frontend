'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth';
import styles from './AppShell.module.css';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const NAV_ITEMS = [
  { href: '/analyse', label: 'Analyse' },
  { href: '/history', label: 'History' },
  { href: '/saved', label: 'Saved & Watchlists' },
  { href: '/portfolio', label: 'Portfolio' },
];

const CollapseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </svg>
);

export default function AppShell({
  children,
  mainClassName,
}: {
  children: React.ReactNode;
  mainClassName?: string;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Stale flag from the old HTML prototype (this app never persists
    // collapse state — it's a pure in-session UI toggle) — clear it
    // defensively in case a user still has it in this browser's storage.
    try {
      localStorage.removeItem('blackline_sidebar_collapsed');
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className={clsx(styles.appShell, collapsed && styles.collapsed)}>
      <button
        className={styles.sidebarReopen}
        type="button"
        aria-label="Expand sidebar"
        onClick={() => setCollapsed(false)}
      >
        <CollapseIcon />
      </button>
      <aside className={styles.appSidebar}>
        <div className={styles.wordmarkRow}>
          <Link href="/analyse" className={styles.wordmark}>
            BLACK<span className={styles.lined}>LINE</span>
          </Link>
          <button
            className={styles.sidebarToggle}
            type="button"
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(true)}
          >
            <CollapseIcon />
          </button>
        </div>
        <nav className={styles.appNav}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname?.startsWith(item.href) ? styles.active : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.appSidebarFoot}>
          {user ? (
            <Link
              href="/account"
              className={clsx(styles.appUser, pathname?.startsWith('/account') && styles.appUserActive)}
            >
              <div className={styles.auAvatar}>{initials(user.name)}</div>
              <div>
                <div className={styles.auName}>{user.name}</div>
                <div className={styles.auPlan}>{user.plan === 'free' ? 'Free Plan' : `${user.plan} Plan`}</div>
              </div>
            </Link>
          ) : (
            <div className={styles.appUser}>
              <div>
                <div className={styles.auName}>Not logged in</div>
                <Link href="/login" className={styles.auPlan}>
                  Log in to save your work →
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className={clsx(styles.appMain, mainClassName)}>{children}</main>
    </div>
  );
}
