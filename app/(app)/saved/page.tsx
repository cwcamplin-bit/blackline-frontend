'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { PROPERTIES, type DemoSlug } from '@/lib/demoProperties';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import { readPrefs, removeSavedDemoSlug, hideDemoSaved as hideDemoSavedPref } from '@/lib/authPrefs';
import { WATCHLIST_NAMES } from '@/lib/watchlists';
import { VERDICT_DOT_CLASS, VERDICT_PILL_CLASS } from '@/lib/verdict';
import type { WatchlistMatch } from '@/lib/types';
import styles from './saved.module.css';

// These four are always shown, matching the original prototype's always-on
// demo cards; the other three demo listings only appear once "saved" from
// a ?property= deep link on /analyse.
const ALWAYS_VISIBLE_DEMO: DemoSlug[] = ['ashworth', 'corporation', 'riverside', 'kings'];

const WATCHLIST_CHIPS: Record<(typeof WATCHLIST_NAMES)[number], string[]> = {
  'Manchester Cash-Flow BTL': ['Yield > 6%', 'Under £250k', '3+ bed'],
  'Leeds Regeneration Corridor': ['Growth focus', '3+ bed', 'Under £300k'],
  'Sub-£150k BRRR Candidates': ['Value Add focus', 'Under £150k'],
};
const WATCHLIST_STATIC_MATCH_LABEL: Record<(typeof WATCHLIST_NAMES)[number], string> = {
  'Manchester Cash-Flow BTL': '4 new matches today',
  'Leeds Regeneration Corridor': '1 new match today',
  'Sub-£150k BRRR Candidates': 'No new matches',
};

// Guards against undefined/non-number input — a saved property's `data` is
// whatever an /api/analyze response looked like at the time it was saved,
// which isn't re-validated against the current AnalysisResult shape on the
// way back out of the database, so a missing/malformed `price` here must
// render as "—" rather than crash the whole page (this was the actual bug:
// an unguarded call below threw "Cannot read properties of undefined
// (reading 'toLocaleString')" and took down the entire Saved page).
function fmtPrice(n: number | undefined | null): string {
  return typeof n === 'number' ? '£' + n.toLocaleString('en-GB') : '—';
}

export default function SavedPage() {
  const { user, updatePrefs } = useAuth();
  const [savedProperties, setSavedProperties] = useState<api.SavedPropertyRow[]>([]);
  const [watchlistMatches, setWatchlistMatches] = useState<Record<string, WatchlistMatch[]>>({});
  const [wlMsg, setWlMsg] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listSaved(), api.listWatchlists()])
      .then(([saved, watchlists]) => {
        if (cancelled) return;
        setSavedProperties(saved);
        setWatchlistMatches(watchlists);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load your saved properties.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const prefs = readPrefs(user);
  const hiddenDemo = new Set(prefs.hiddenDemoSaved);
  const demoSlugs = Array.from(new Set([...ALWAYS_VISIBLE_DEMO, ...prefs.savedDemoSlugs])).filter(
    (s): s is DemoSlug => s in PROPERTIES && !hiddenDemo.has(s)
  );

  function unsaveDemo(slug: DemoSlug) {
    const next = removeSavedDemoSlug(hideDemoSavedPref(prefs, slug), slug);
    updatePrefs(next).catch(() => {
      /* the optimistic UI update below is what the user sees; a failed
         write here just means it may reappear on next load — acceptable
         for a non-critical preference toggle */
    });
  }

  function unsaveReal(sourceUrl: string) {
    setSavedProperties((prev) => prev.filter((r) => r.sourceUrl !== sourceUrl));
    api.deleteSaved(sourceUrl).catch(() => {
      /* best-effort — see unsaveDemo */
    });
  }

  function handleWatchlistStub(action: 'new' | string) {
    const key = action === 'new' ? 'new' : action;
    const label = action === 'new' ? "Watchlist builder isn't wired up yet" : "Editing isn't wired up yet";
    setWlMsg((prev) => ({ ...prev, [key]: label }));
    setTimeout(() => {
      setWlMsg((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2200);
  }

  const totalSaved = demoSlugs.length + savedProperties.length;

  return (
    <>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          SAVED &amp; WATCHLISTS
        </div>
        <h1>Saved properties &amp; watchlists.</h1>
        <p className={styles.sub}>
          Deals you&apos;ve bookmarked, plus standing searches that alert you the moment a matching property appears.
        </p>
        {loadError && <p className={styles.sub} style={{ color: 'var(--red, #c0392b)' }}>{loadError}</p>}
      </div>

      <div className={styles.sectionTitleRow}>
        <h2>Saved properties ({totalSaved})</h2>
        <Link href="/analyse" className="btn btn-ghost">
          + Analyse another
        </Link>
      </div>
      <div className={styles.propGrid}>
        {demoSlugs.map((slug) => {
          const data = PROPERTIES[slug];
          return (
            <div className={styles.propCard} key={slug}>
              <div className={styles.pcTop}>
                <div className={styles.pcAddr}>
                  {data.address}
                  <small>
                    {data.address.split(',').slice(-1)[0]?.trim()} · {fmtPrice(data.price)}
                  </small>
                </div>
                <span className={clsx(styles.pill, styles[VERDICT_PILL_CLASS[data.verdict]])}>
                  {data.verdictLabel}
                </span>
              </div>
              <div className={styles.pcChips}>
                <span className={styles.chip}>{data.financials.yieldPct} yield</span>
                <span className={styles.chip}>{data.type}</span>
              </div>
              <div className={styles.pcFoot}>
                <span className={styles.pcVerdict}>
                  <span className={clsx(styles.dot, VERDICT_DOT_CLASS[data.verdict])} />
                  {data.confidence}% confidence
                </span>
                <div className={styles.pcFootActions}>
                  <Link href={`/analyse?property=${slug}`} className={styles.pcLink}>
                    View →
                  </Link>
                  <button
                    type="button"
                    className={styles.pcRemove}
                    title="Remove from saved"
                    onClick={() => unsaveDemo(slug)}
                  >
                    Unsave
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {savedProperties.map(({ sourceUrl, data }) => (
          <div className={styles.propCard} key={sourceUrl}>
            <div className={styles.pcTop}>
              <div className={styles.pcAddr}>
                {data.address}
                <small>{fmtPrice(data.price)}</small>
              </div>
              <span className={clsx(styles.pill, styles[VERDICT_PILL_CLASS[data.verdict]])}>
                {data.verdictLabel || '—'}
              </span>
            </div>
            <div className={styles.pcChips}>
              {data.financials?.yieldPct && <span className={styles.chip}>{data.financials.yieldPct} yield</span>}
              {data.type && <span className={styles.chip}>{data.type}</span>}
            </div>
            <div className={styles.pcFoot}>
              <span className={styles.pcVerdict}>
                <span className={clsx(styles.dot, VERDICT_DOT_CLASS[data.verdict] || 'dot-invest')} />
                {data.confidence != null ? `${data.confidence}% confidence` : '—'}
              </span>
              <div className={styles.pcFootActions}>
                <Link href={`/analyse?savedUrl=${encodeURIComponent(sourceUrl)}`} className={styles.pcLink}>
                  View →
                </Link>
                <button
                  type="button"
                  className={styles.pcRemove}
                  title="Remove from saved"
                  onClick={() => unsaveReal(sourceUrl)}
                >
                  Unsave
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.sectionTitleRow}>
        <h2>Watchlists (3)</h2>
        <button type="button" className="btn btn-gold" onClick={() => handleWatchlistStub('new')}>
          {wlMsg.new || '+ New watchlist'}
        </button>
      </div>
      <div>
        {WATCHLIST_NAMES.map((name) => {
          const matches = watchlistMatches[name] || [];
          return (
            <div className={styles.wlRow} key={name}>
              <div>
                <div className={styles.wlName}>{name}</div>
                <div className={styles.wlChips}>
                  {WATCHLIST_CHIPS[name].map((c) => (
                    <span className={styles.chip} key={c}>
                      {c}
                    </span>
                  ))}
                </div>
                {matches.length > 0 && (
                  <div className={styles.wlManualMatches}>
                    {matches.map((m) => (
                      <Link
                        key={m.sourceUrl}
                        className={styles.wlManualMatch}
                        href={`/analyse?savedUrl=${encodeURIComponent(m.sourceUrl)}`}
                      >
                        {m.address}
                        {typeof m.price === 'number' ? ` · ${fmtPrice(m.price)}` : ''}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.wlRight}>
                <span
                  className={styles.wlMatch}
                  style={WATCHLIST_STATIC_MATCH_LABEL[name] === 'No new matches' ? { color: 'var(--text-faint)' } : undefined}
                >
                  {WATCHLIST_STATIC_MATCH_LABEL[name]}
                </span>
                <button type="button" className="btn btn-ghost" onClick={() => handleWatchlistStub(name)}>
                  {wlMsg[name] || 'Edit'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
