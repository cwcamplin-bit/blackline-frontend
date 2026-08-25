'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { PROPERTIES } from '@/lib/demoProperties';
import { VERDICT_DOT_CLASS } from '@/lib/verdict';
import styles from './dashboard.module.css';

// Orphaned from the sidebar nav since Round 6 of the original prototype —
// still reachable directly, kept unlinked here too pending a decision on
// whether to delete it or fold its content elsewhere (see the migration
// roadmap doc).
const RECENT: { slug: keyof typeof PROPERTIES; area: string }[] = [
  { slug: 'ashworth', area: 'Manchester M20' },
  { slug: 'corporation', area: 'Leeds LS1' },
  { slug: 'kings', area: 'Sheffield S2' },
  { slug: 'milton', area: 'Nottingham NG7' },
];

export default function DashboardPage() {
  return (
    <>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          OVERVIEW
        </div>
        <h1>Welcome back, Sophie.</h1>
        <p className={styles.sub}>
          Here&apos;s what&apos;s happened since you last checked in. Two of your watchlists have new matches today.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.scNum}>12</div>
          <div className={styles.scLabel}>Analyses this month</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scNum}>7</div>
          <div className={styles.scLabel}>Saved properties</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scNum}>3</div>
          <div className={styles.scLabel}>Active watchlists</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scNum}>81%</div>
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
        {RECENT.map(({ slug, area }) => {
          const data = PROPERTIES[slug];
          return (
            <div className={styles.arow} key={slug}>
              <span className={clsx(styles.arDot, VERDICT_DOT_CLASS[data.verdict])} />
              <div className={styles.arAddr}>
                {data.address.split(',')[0]}
                <small>
                  {area} · £{data.price.toLocaleString('en-GB')}
                </small>
              </div>
              <span className={styles.arMeta}>
                {data.verdictLabel} · {data.confidence}%
              </span>
              <Link href={`/analyse?property=${slug}`} className={styles.arLink}>
                View report →
              </Link>
            </div>
          );
        })}
      </div>

      <div className={styles.panelBlock}>
        <div className={styles.panelTitleRow}>
          <h2>Watchlist activity</h2>
          <Link href="/saved" className={styles.viewAll}>
            Manage watchlists →
          </Link>
        </div>
        <div className={styles.wlRow} style={{ marginBottom: 12 }}>
          <div>
            <div className={styles.wlName}>Manchester Cash-Flow BTL</div>
            <span className={styles.chip}>Yield &gt; 6%</span> <span className={styles.chip}>Under £250k</span>
          </div>
          <span className={styles.wlMatch}>4 new matches today</span>
        </div>
        <div className={styles.wlRow}>
          <div>
            <div className={styles.wlName}>Leeds Regeneration Corridor</div>
            <span className={styles.chip}>Growth focus</span> <span className={styles.chip}>3+ bed</span>
          </div>
          <span className={styles.wlMatch}>1 new match today</span>
        </div>
      </div>
    </>
  );
}
