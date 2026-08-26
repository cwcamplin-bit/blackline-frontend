'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { VERDICT_DOT_CLASS } from '@/lib/verdict';
import type { HistoryEntry, Watchlist } from '@/lib/types';
import styles from './dashboard.module.css';

function fmtMoney(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listHistory(), api.listWatchlists(), api.listSaved()])
      .then(([h, w, s]) => {
        if (cancelled) return;
        setHistory(h);
        setWatchlists(w);
        setSavedCount(s.length);
      })
      .catch(() => {
        /* stat row / lists below just render empty — no need to surface a
           separate error banner on what's meant to be a lightweight overview */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const analysesThisMonth = history.filter((h) => {
    const d = new Date(h.analysedDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const avgConfidence =
    history.length > 0 ? Math.round(history.reduce((sum, h) => sum + (h.confidence || 0), 0) / history.length) : null;
  const totalMatches = watchlists.reduce((sum, w) => sum + w.matches.length, 0);

  const recent = history.slice(0, 4);
  const topWatchlists = [...watchlists].sort((a, b) => b.matches.length - a.matches.length).slice(0, 2);

  return (
    <>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          OVERVIEW
        </div>
        <h1>Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
        <p className={styles.sub}>
          {loading
            ? 'Loading your activity…'
            : totalMatches > 0
              ? `Here's what's happened recently. ${totalMatches} watchlist match${totalMatches === 1 ? '' : 'es'} waiting for a look.`
              : "Here's what's happened recently."}
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.scNum}>{analysesThisMonth}</div>
          <div className={styles.scLabel}>Analyses this month</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scNum}>{savedCount}</div>
          <div className={styles.scLabel}>Saved properties</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scNum}>{watchlists.length}</div>
          <div className={styles.scLabel}>Active watchlists</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scNum}>{avgConfidence != null ? `${avgConfidence}%` : '—'}</div>
          <div className={styles.scLabel}>Avg. confidence</div>
        </div>
      </div>

      <div className={styles.ctaStrip}>
        <div>
          <h3>Run a new analysis</h3>
          <p>Paste a listing URL and get a full investment report in under 30 seconds.</p>
        </div>
        <Link href="/analyse" className="btn btn-gold">
          Analyse a property →
        </Link>
      </div>

      <div className={styles.panelBlock}>
        <div className={styles.panelTitleRow}>
          <h2>Recent analyses</h2>
          <Link href="/history" className={styles.viewAll}>
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
            Nothing analysed yet — <Link href="/analyse">run your first report →</Link>
          </p>
        ) : (
          recent.map((h) => (
            <div className={styles.arow} key={h.sourceUrl}>
              <span className={clsx(styles.arDot, VERDICT_DOT_CLASS[h.verdict])} />
              <div className={styles.arAddr}>
                {h.address.split(',')[0]}
                <small>{fmtMoney(h.price)}</small>
              </div>
              <span className={styles.arMeta}>
                {h.verdictLabel} · {h.confidence}%
              </span>
              <Link href={`/analyse?savedUrl=${encodeURIComponent(h.sourceUrl)}`} className={styles.arLink}>
                View report →
              </Link>
            </div>
          ))
        )}
      </div>

      <div className={styles.panelBlock}>
        <div className={styles.panelTitleRow}>
          <h2>Watchlist activity</h2>
          <Link href="/watchlists" className={styles.viewAll}>
            Manage watchlists →
          </Link>
        </div>
        {topWatchlists.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
            No watchlists yet — <Link href="/watchlists">create one →</Link>
          </p>
        ) : (
          topWatchlists.map((w, i) => (
            <div className={styles.wlRow} style={i === 0 ? { marginBottom: 12 } : undefined} key={w.id}>
              <div>
                <div className={styles.wlName}>{w.name}</div>
                {w.criteria.map((c) => (
                  <span className={styles.chip} key={c}>
                    {c}
                  </span>
                ))}
              </div>
              <span className={styles.wlMatch} style={w.matches.length === 0 ? { color: 'var(--text-faint)' } : undefined}>
                {w.matches.length === 0 ? 'No matches yet' : `${w.matches.length} match${w.matches.length === 1 ? '' : 'es'}`}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
