'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { VERDICT_PILL_CLASS } from '@/lib/verdict';
import type { AnalysisResult } from '@/lib/types';
import styles from './compare.module.css';

const SLOT_COUNT = 3;

function fmtMoney(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB');
}
function pctToNumber(pct: string): number {
  return parseFloat(pct.replace('%', '')) || 0;
}
function bestStrategy(s: AnalysisResult['strategy']): string {
  const entries: [string, number][] = [
    ['BTL', s.btl],
    ['BRRR', s.brrr],
    ['Flip', s.flip],
  ];
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

type MetricRow = {
  label: string;
  get: (r: AnalysisResult) => string;
  numeric?: (r: AnalysisResult) => number;
  higherIsBetter?: boolean;
};

const METRICS: MetricRow[] = [
  { label: 'Price', get: (r) => fmtMoney(r.price) },
  { label: 'Verdict', get: (r) => r.verdictLabel },
  { label: 'Confidence', get: (r) => `${r.confidence}%`, numeric: (r) => r.confidence, higherIsBetter: true },
  {
    label: 'Net yield',
    get: (r) => r.financials.yieldPct,
    numeric: (r) => pctToNumber(r.financials.yieldPct),
    higherIsBetter: true,
  },
  {
    label: 'Cash-on-cash ROI',
    get: (r) => r.financials.roiPct,
    numeric: (r) => pctToNumber(r.financials.roiPct),
    higherIsBetter: true,
  },
  {
    label: 'Monthly cashflow',
    get: (r) => (r.financials.cashflow >= 0 ? '+' : '') + fmtMoney(r.financials.cashflow),
    numeric: (r) => r.financials.cashflow,
    higherIsBetter: true,
  },
  { label: 'Growth score', get: (r) => `${r.scores.growth}/100`, numeric: (r) => r.scores.growth, higherIsBetter: true },
  {
    label: 'Value Add score',
    get: (r) => `${r.scores.valueAdd}/100`,
    numeric: (r) => r.scores.valueAdd,
    higherIsBetter: true,
  },
  {
    label: 'Security score',
    get: (r) => `${r.scores.security}/100`,
    numeric: (r) => r.scores.security,
    higherIsBetter: true,
  },
  {
    label: 'Cashflow score',
    get: (r) => `${r.scores.cashflow}/100`,
    numeric: (r) => r.scores.cashflow,
    higherIsBetter: true,
  },
  { label: 'Best-fit strategy', get: (r) => bestStrategy(r.strategy) },
];

export default function ComparePage() {
  const { user, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<AnalysisResult[]>([]);
  const [slots, setSlots] = useState<(string | null)[]>(Array(SLOT_COUNT).fill(null));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const isProfessional = user?.plan === 'professional';

  useEffect(() => {
    if (!isProfessional) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([api.listSaved(), api.listHistory()])
      .then(([saved, history]) => {
        if (cancelled) return;
        const bySourceUrl = new Map<string, AnalysisResult>();
        // History first: it's the fuller, more current record of an
        // analysis, so a property present in both wins from here.
        for (const h of history) bySourceUrl.set(h.sourceUrl, h);
        for (const s of saved) if (!bySourceUrl.has(s.sourceUrl)) bySourceUrl.set(s.sourceUrl, s.data);
        setCandidates(Array.from(bySourceUrl.values()));
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load your properties.'))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isProfessional]);

  const selected = useMemo(
    () =>
      slots
        .map((url) => (url ? candidates.find((c) => c.sourceUrl === url) : undefined))
        .filter((c): c is AnalysisResult => Boolean(c)),
    [slots, candidates]
  );

  function setSlot(i: number, url: string) {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = url || null;
      return next;
    });
  }

  if (!authLoading && !isProfessional) {
    return (
      <>
        <div className={styles.appHeader}>
          <div className="eyebrow">
            <span className="el" />
            COMPARE
          </div>
          <h1>Side-by-side comparison.</h1>
          <p className={styles.sub}>Line up two or three properties and see every number next to each other.</p>
        </div>
        <div className={styles.lockedPanel}>
          <h2>This is a Professional feature</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 18, maxWidth: 480 }}>
            Side-by-side comparison is included on the Professional plan (£99/mo), alongside everything in Pro.
            Upgrade to compare properties from your saved and history lists.
          </p>
          <Link href="/plans" className="btn btn-gold">
            View plans →
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          COMPARE
        </div>
        <h1>Side-by-side comparison.</h1>
        <p className={styles.sub}>
          Pick two or three properties from your saved or analysed history to see how they stack up.
        </p>
        {loadError && <p className={styles.sub} style={{ color: 'var(--red, #c0392b)' }}>{loadError}</p>}
      </div>

      {!loading && candidates.length === 0 ? (
        <div className={styles.lockedPanel}>
          <h2>Nothing to compare yet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 18 }}>
            Analyse and save a couple of properties first, then come back here to line them up.
          </p>
          <Link href="/analyse" className="btn btn-gold">
            Analyse a property →
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.slotRow}>
            {slots.map((val, i) => (
              <div className={styles.field} key={i}>
                <label htmlFor={`slot-${i}`}>Property {String.fromCharCode(65 + i)}</label>
                <select id={`slot-${i}`} value={val || ''} onChange={(e) => setSlot(i, e.target.value)}>
                  <option value="">— Select a property —</option>
                  {candidates.map((c) => (
                    <option key={c.sourceUrl} value={c.sourceUrl}>
                      {c.address} · {fmtMoney(c.price)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {selected.length < 2 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Select at least two properties to compare.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th></th>
                    {selected.map((r) => (
                      <th key={r.sourceUrl}>
                        <div className={styles.colAddr}>{r.address}</div>
                        <span className={clsx(styles.pill, styles[VERDICT_PILL_CLASS[r.verdict]])}>
                          {r.verdictLabel}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((m) => {
                    const values = selected.map((r) => (m.numeric ? m.numeric(r) : null));
                    const best = m.higherIsBetter && values.every((v) => v != null) ? Math.max(...(values as number[])) : null;
                    return (
                      <tr key={m.label}>
                        <td className={styles.rowLabel}>{m.label}</td>
                        {selected.map((r, i) => (
                          <td
                            key={r.sourceUrl}
                            className={clsx(styles.monoCell, best != null && values[i] === best && styles.winner)}
                          >
                            {m.get(r)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr>
                    <td className={styles.rowLabel}>Report</td>
                    {selected.map((r) => (
                      <td key={r.sourceUrl}>
                        <Link href={`/analyse?savedUrl=${encodeURIComponent(r.sourceUrl)}`} className={styles.viewLink}>
                          View full report →
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
