'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { PROPERTIES, type DemoSlug } from '@/lib/demoProperties';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import { readPrefs, hideDemoHistory as hideDemoHistoryPref } from '@/lib/authPrefs';
import { VERDICT_DOT_CLASS } from '@/lib/verdict';
import type { HistoryEntry, Verdict } from '@/lib/types';
import styles from './history.module.css';

const STATIC_ROWS: { slug: DemoSlug; date: string }[] = [
  { slug: 'ashworth', date: '18 Aug 2026' },
  { slug: 'riverside', date: '15 Aug 2026' },
  { slug: 'corporation', date: '12 Aug 2026' },
  { slug: 'orchard', date: '9 Aug 2026' },
  { slug: 'kings', date: '6 Aug 2026' },
  { slug: 'milton', date: '2 Aug 2026' },
  { slug: 'factory', date: '29 Jul 2026' },
];

const FILTERS: { key: 'all' | Verdict; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'strongbuy', label: 'Strong Buy' },
  { key: 'buy', label: 'Buy' },
  { key: 'invest', label: 'Investigate Further' },
  { key: 'caution', label: 'Proceed with Caution' },
  { key: 'pass', label: 'Pass' },
];

function fmtHistoryDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function HistoryPage() {
  const { user, updatePrefs } = useAuth();
  const [realLog, setRealLog] = useState<HistoryEntry[]>([]);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<'all' | Verdict>('all');

  useEffect(() => {
    let cancelled = false;
    api
      .listHistory()
      .then((log) => {
        if (!cancelled) setRealLog(log);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load your history.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const prefs = readPrefs(user);
  const hiddenDemo = new Set(prefs.hiddenDemoHistory);
  const visibleStatic = STATIC_ROWS.filter((r) => !hiddenDemo.has(r.slug));
  const totalCount = realLog.length + visibleStatic.length;

  const filteredReal = useMemo(
    () => (filter === 'all' ? realLog : realLog.filter((e) => e.verdict === filter)),
    [realLog, filter]
  );
  const filteredStatic = useMemo(
    () => (filter === 'all' ? visibleStatic : visibleStatic.filter((r) => PROPERTIES[r.slug].verdict === filter)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleStatic, filter]
  );

  function removeReal(sourceUrl: string) {
    setRealLog((prev) => prev.filter((e) => e.sourceUrl !== sourceUrl));
    api.deleteHistory(sourceUrl).catch(() => {
      /* best-effort — a failed delete just means it may reappear on next load */
    });
  }

  function removeStatic(slug: string) {
    updatePrefs(hideDemoHistoryPref(prefs, slug)).catch(() => {
      /* best-effort, see removeReal */
    });
  }

  const visibleCount = filteredReal.length + filteredStatic.length;

  return (
    <>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          HISTORY
        </div>
        <h1>Your analysis history.</h1>
        <p className={styles.sub}>
          Every property Blackline has run for you, with the verdict and confidence rating from the day you
          analysed it.
        </p>
        {loadError && <p className={styles.sub} style={{ color: 'var(--red, #c0392b)' }}>{loadError}</p>}
      </div>

      <div className={styles.filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={clsx(styles.filterChip, filter === f.key && styles.active)}
            onClick={() => setFilter(f.key)}
            type="button"
          >
            {f.key === 'all' ? `All (${totalCount})` : f.label}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        {visibleCount > 0 ? (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Property</th>
                <th>Analysed</th>
                <th>Verdict</th>
                <th>Confidence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredReal.map((entry) => {
                const priceLabel = typeof entry.price === 'number' ? '£' + entry.price.toLocaleString('en-GB') : '';
                const bedType = [entry.beds ? `${entry.beds} bed` : '', entry.type || ''].filter(Boolean).join(' ');
                const meta = [bedType, priceLabel].filter(Boolean).join(' · ');
                return (
                  <tr className={styles.hrow} key={entry.sourceUrl}>
                    <td className={styles.dtAddr}>
                      {entry.address || 'Unknown address'}
                      {meta && <small>{meta}</small>}
                    </td>
                    <td className={styles.monoCell}>{fmtHistoryDate(entry.analysedDate)}</td>
                    <td>
                      <div className={styles.verdictCell}>
                        <span className={clsx(styles.verdictDot, VERDICT_DOT_CLASS[entry.verdict])} />
                        {entry.verdictLabel}
                      </div>
                    </td>
                    <td className={styles.monoCell}>{entry.confidence != null ? `${entry.confidence}%` : '—'}</td>
                    <td>
                      <div className={styles.dtActions}>
                        <Link href={`/analyse?savedUrl=${encodeURIComponent(entry.sourceUrl)}`} className={styles.dtLink}>
                          View report →
                        </Link>
                        <button
                          type="button"
                          className={styles.dtRemove}
                          title="Remove from history"
                          onClick={() => removeReal(entry.sourceUrl)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStatic.map((row) => {
                const data = PROPERTIES[row.slug];
                return (
                  <tr className={styles.hrow} key={row.slug}>
                    <td className={styles.dtAddr}>
                      {data.address}
                      <small>
                        {data.address.split(',').slice(-1)[0]?.trim()} · £{data.price.toLocaleString('en-GB')}
                      </small>
                    </td>
                    <td className={styles.monoCell}>{row.date}</td>
                    <td>
                      <div className={styles.verdictCell}>
                        <span className={clsx(styles.verdictDot, VERDICT_DOT_CLASS[data.verdict])} />
                        {data.verdictLabel}
                      </div>
                    </td>
                    <td className={styles.monoCell}>{data.confidence}%</td>
                    <td>
                      <div className={styles.dtActions}>
                        <Link href={`/analyse?property=${row.slug}`} className={styles.dtLink}>
                          View report →
                        </Link>
                        <button
                          type="button"
                          className={styles.dtRemove}
                          title="Remove from history"
                          onClick={() => removeStatic(row.slug)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyNote}>No analyses match this filter yet.</div>
        )}
      </div>
    </>
  );
}
