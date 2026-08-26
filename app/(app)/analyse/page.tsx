'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { readPrefs, addSavedDemoSlug } from '@/lib/authPrefs';
import { findDemoSlugBySourceUrl, PROPERTIES, type DemoSlug } from '@/lib/demoProperties';
import { buildPrintableReport } from '@/lib/printableReport';
import { VERDICT_PILL_CLASS } from '@/lib/verdict';
import type { AnalysisResult } from '@/lib/types';
import InvestmentDiamond from '@/components/InvestmentDiamond';
import styles from './analyse.module.css';

function fmtMoney(n: number) {
  return '£' + Number(n).toLocaleString('en-GB');
}
function scoreLabel(n: number) {
  if (n >= 80) return 'Excellent';
  if (n >= 65) return 'Strong';
  if (n >= 50) return 'Moderate';
  return 'Weak';
}

function AnalysePageInner() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading, updatePrefs } = useAuth();

  const [urlInput, setUrlInput] = useState('rightmove.co.uk/properties/154829201');
  const [urlNote, setUrlNote] = useState('Works with Rightmove listings today, Zoopla next.');
  const [urlNoteError, setUrlNoteError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skNote, setSkNote] = useState('Extracting data · running financial engine · gathering market intelligence…');

  const [currentData, setCurrentData] = useState<AnalysisResult | null>(null);
  const [currentSlug, setCurrentSlug] = useState<DemoSlug | null>(null);
  const [confWidth, setConfWidth] = useState('0%');
  const [actionMsg, setActionMsg] = useState('');
  const [wlPickerOpen, setWlPickerOpen] = useState(false);
  const [watchlistNames, setWatchlistNames] = useState<string[]>([]);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);
  const wlPickerRef = useRef<HTMLDivElement>(null);

  // ---------- Deep links: ?property=slug or ?savedUrl=<encoded sourceUrl> ----------
  // Runs once auth's initial check has resolved (authLoading is false), since
  // the saved/history lookups below need to know whether there's a logged-in
  // user to fetch against — a guest simply has none of either, and a demo
  // slug (no network needed) still resolves instantly either way.
  useEffect(() => {
    if (authLoading) return;

    const propertySlug = searchParams.get('property');
    if (propertySlug && propertySlug in PROPERTIES) {
      const slug = propertySlug as DemoSlug;
      setUrlInput(PROPERTIES[slug].sourceUrl);
      setCurrentSlug(slug);
      setCurrentData(PROPERTIES[slug]);
      return;
    }

    const savedUrl = searchParams.get('savedUrl');
    if (!savedUrl) return;

    (async () => {
      if (user) {
        try {
          const [saved, history] = await Promise.all([api.listSaved(), api.listHistory()]);
          const savedRow = saved.find((r) => r.sourceUrl === savedUrl);
          if (savedRow) {
            setUrlInput(savedRow.data.sourceUrl);
            setCurrentSlug(null);
            setCurrentData(savedRow.data);
            return;
          }
          const historyEntry = history.find((h) => h.sourceUrl === savedUrl);
          if (historyEntry) {
            setUrlInput(historyEntry.sourceUrl);
            setCurrentSlug(null);
            setCurrentData(historyEntry);
            return;
          }
        } catch {
          // fall through to the demo-slug check below rather than dead-ending
        }
      }
      const demoSlug = findDemoSlugBySourceUrl(savedUrl);
      if (demoSlug) {
        setUrlInput(PROPERTIES[demoSlug].sourceUrl);
        setCurrentSlug(demoSlug);
        setCurrentData(PROPERTIES[demoSlug]);
        return;
      }
      setUrlNoteError(true);
      setUrlNote(
        user
          ? 'Could not find that saved property — it may have been removed.'
          : 'Could not find that saved property — log in to see properties saved to your account.'
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Animate the confidence bar whenever a new report is shown.
  useEffect(() => {
    if (!currentData) return;
    setConfWidth('0%');
    const t = setTimeout(() => setConfWidth(`${currentData.confidence}%`), 150);
    return () => clearTimeout(t);
  }, [currentData]);

  // Close the watchlist picker on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wlPickerOpen && wlPickerRef.current && !wlPickerRef.current.contains(e.target as Node)) {
        setWlPickerOpen(false);
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [wlPickerOpen]);

  async function handleAnalyse() {
    if (!urlInput.trim()) {
      setUrlNoteError(true);
      setUrlNote('Paste a property URL to continue.');
      return;
    }
    setUrlNoteError(false);
    setUrlNote('Works with Rightmove listings today, Zoopla next.');
    setQuotaExceeded(false);
    setCurrentData(null);
    setLoading(true);
    setSkNote('Extracting data · running financial engine · gathering market intelligence…');

    const coldStartTimer = setTimeout(() => {
      setSkNote('Still working — the server may have been asleep and is waking up. This can take up to a minute.');
    }, 6000);

    try {
      const data = await api.analyseProperty(urlInput.trim());
      setCurrentSlug(null);
      setCurrentData(data);
      // Recording to history requires an account — a guest can still run
      // the analysis and see the report, just nothing is kept afterwards.
      if (user) {
        api.recordHistory(data.sourceUrl, data).catch(() => {
          /* best-effort — the report itself already rendered successfully */
        });
      }
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (err) {
      setUrlNoteError(true);
      if (err instanceof ApiError && err.status === 429 && err.code === 'quota_exceeded') {
        setQuotaExceeded(true);
        setUrlNote(err.message);
      } else {
        setUrlNote(err instanceof Error ? err.message : 'Something went wrong analysing that listing.');
      }
    } finally {
      clearTimeout(coldStartTimer);
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!currentSlug && !currentData) return;
    if (!user) {
      setActionMsg('Log in to save properties to your account.');
      return;
    }
    try {
      if (currentSlug) {
        await updatePrefs(addSavedDemoSlug(readPrefs(user), currentSlug));
      } else if (currentData) {
        await api.saveProperty(currentData.sourceUrl, currentData);
      }
      setActionMsg('Saved — it now appears on your Saved & Watchlists page.');
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Could not save this property. Please try again.');
    }
  }

  function handleWatchClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentData) return;
    if (!user) {
      setActionMsg('Log in to add properties to a watchlist.');
      return;
    }
    const opening = !wlPickerOpen;
    setWlPickerOpen(opening);
    if (opening) {
      // Watchlists are user-created (Saved & Watchlists page) rather than a
      // fixed list, so this is fetched fresh each time the picker opens
      // instead of read from a hardcoded constant.
      api
        .listWatchlists()
        .then((lists) => setWatchlistNames(lists.map((w) => w.name)))
        .catch(() => setWatchlistNames([]));
    }
  }

  async function handleWatchPick(name: string) {
    if (!currentData) return;
    setWlPickerOpen(false);
    try {
      await api.addWatchlistMatch(name, currentData);
      setActionMsg(`Added to "${name}" — it now shows on your Saved & Watchlists page.`);
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Could not add to that watchlist. Please try again.');
    }
  }

  async function handleTrackOffer() {
    if (!currentData) return;
    if (!user) {
      setActionMsg('Log in to track an offer on this property.');
      return;
    }
    try {
      // Idempotent on the backend — clicking this again for the same
      // property just finds the existing offer rather than duplicating it.
      await api.trackOffer(currentData.sourceUrl, currentData.address, currentData.price);
      setActionMsg('Now tracking an offer on this property — manage its status on your Offers page.');
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Could not track an offer on this property. Please try again.');
    }
  }

  function handleExport() {
    if (!currentData) return;
    const html = buildPrintableReport(currentData);
    const win = window.open('', '_blank');
    if (!win) {
      setActionMsg('Your browser blocked the export window — allow pop-ups for this page and try again.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setActionMsg("Export opened in a new tab — use your browser's print dialog to save it as a PDF.");
  }

  const data = currentData;
  const dq = data?.data_quality;

  return (
    <>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          ANALYSE
        </div>
        <h1>Analyse a property.</h1>
        <p className={styles.sub}>
          Paste a listing URL and Blackline will run the full pipeline — extraction, financial modelling, market
          intelligence and AI reasoning.
        </p>
      </div>

      <div className={styles.urlMock}>
        <input
          type="text"
          aria-label="Property listing URL"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAnalyse();
          }}
        />
        <button type="button" onClick={handleAnalyse} disabled={loading}>
          {loading ? 'Analysing…' : 'Analyse →'}
        </button>
      </div>
      <div className={clsx(styles.heroNote, urlNoteError && styles.error)}>{urlNote}</div>
      {quotaExceeded && (
        <div style={{ marginTop: 10 }}>
          <Link href="/plans" className="btn btn-gold">
            Upgrade to Pro →
          </Link>
        </div>
      )}

      {loading && (
        <div className={styles.skeletonBlock}>
          <div className={clsx(styles.sk, styles.skCard)} />
          <div className={clsx(styles.sk, styles.skRow)} />
          <div className={clsx(styles.sk, styles.skRow, styles.skRowHalf)} />
          <div className={styles.skNote}>{skNote}</div>
        </div>
      )}

      {data && (
        <div className={styles.reportBlock} ref={reportRef}>
          <div className={styles.reportHead}>
            <div>
              <div className={styles.rhAddr}>{data.address}</div>
              <div className={styles.rhMeta}>
                {fmtMoney(data.price)} · {data.beds} bed {data.type} · {data.sourceUrl}
              </div>
            </div>
            <div className={styles.reportActions} ref={wlPickerRef}>
              <button type="button" className="btn btn-ghost" onClick={handleSave}>
                Save
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleWatchClick}>
                Add to watchlist
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleTrackOffer}>
                Track offer
              </button>
              <button type="button" className="btn btn-gold" onClick={handleExport}>
                Export report
              </button>
              {wlPickerOpen && (
                <div className={styles.wlPicker}>
                  <div className={styles.wlPickerTitle}>Add to which watchlist?</div>
                  {watchlistNames.length > 0 ? (
                    watchlistNames.map((name) => (
                      <button key={name} type="button" className={styles.wlPick} onClick={() => handleWatchPick(name)}>
                        {name}
                      </button>
                    ))
                  ) : (
                    <Link href="/saved" className={styles.wlPick}>
                      No watchlists yet — create one →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={styles.actionMsg}>
            {actionMsg}
            {!user && !actionMsg && (
              <>
                {' '}
                <Link href="/login">Log in</Link> to save reports, build history and use watchlists.
              </>
            )}
          </div>

          <div className={styles.twoCol}>
            <div className={styles.diamondCard}>
              <div className={styles.dcTitle}>Investment DNA</div>
              <InvestmentDiamond scores={data.scores} maxWidth="260px" trigger="immediate" />
              <div className={styles.dcFoot}>
                <span className={clsx(styles.pill, styles[VERDICT_PILL_CLASS[data.verdict]])}>
                  {data.verdictLabel}
                </span>
                <div className={styles.confBar}>
                  <span className={styles.confLabel}>Confidence</span>
                  <div className={styles.confTrack}>
                    <div className={styles.confFill} style={{ width: confWidth }} />
                  </div>
                  <span className={styles.confLabel}>{data.confidence}%</span>
                </div>
              </div>
            </div>

            <div className={styles.panelBlock} style={{ marginBottom: 0 }}>
              <h2>Four dimensions</h2>
              <div className={styles.dims}>
                <div className={styles.dimRow}>
                  <div className={styles.dimTag}>CASHFLOW</div>
                  <div className={styles.dimBody}>
                    <h3>Income generation</h3>
                    <p>
                      {scoreLabel(data.scores.cashflow)} — {data.clauses.cashflow}.
                    </p>
                  </div>
                </div>
                <div className={styles.dimRow}>
                  <div className={styles.dimTag}>GROWTH</div>
                  <div className={styles.dimBody}>
                    <h3>Capital growth</h3>
                    <p>
                      {scoreLabel(data.scores.growth)} — {data.clauses.growth}.
                    </p>
                  </div>
                </div>
                <div className={styles.dimRow}>
                  <div className={styles.dimTag}>VALUE ADD</div>
                  <div className={styles.dimBody}>
                    <h3>Value-add potential</h3>
                    <p>
                      {scoreLabel(data.scores.valueAdd)} — {data.clauses.valueAdd}.
                    </p>
                  </div>
                </div>
                <div className={styles.dimRow}>
                  <div className={styles.dimTag}>SECURITY</div>
                  <div className={styles.dimBody}>
                    <h3>Investment security</h3>
                    <p>
                      {scoreLabel(data.scores.security)} — {data.clauses.security}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.panelBlock}>
            <h2>Executive summary</h2>
            <p className={styles.aiSummary}>{data.summary}</p>
          </div>

          <div className={styles.twoCol}>
            <div className={styles.panelBlock} style={{ marginBottom: 0 }}>
              <h2>Financial analysis</h2>
              <div className={styles.rrow}>
                <span className={styles.rk}>Purchase price</span>
                <span className={styles.rv}>{fmtMoney(data.financials.purchase)}</span>
              </div>
              <div className={styles.rrow}>
                <span className={styles.rk}>Stamp Duty</span>
                <span className={styles.rv}>{fmtMoney(data.financials.stampDuty)}</span>
              </div>
              <div className={styles.rrow}>
                <span className={styles.rk}>Deposit (25%)</span>
                <span className={styles.rv}>{fmtMoney(data.financials.deposit)}</span>
              </div>
              <div className={styles.rrow}>
                <span className={styles.rk}>Mortgage (75% LTV, 5.9%)</span>
                <span className={styles.rv}>{fmtMoney(data.financials.mortgage)}/mo</span>
              </div>
              <div className={styles.rrow}>
                <span className={styles.rk}>Estimated rent</span>
                <span className={styles.rv}>{fmtMoney(data.financials.rent)}/mo</span>
              </div>
              <div className={clsx(styles.rrow, styles.total)}>
                <span className={styles.rk}>Net monthly cashflow</span>
                <span className={styles.rv}>{fmtMoney(data.financials.cashflow)}</span>
              </div>
              <div className={clsx(styles.rrow, styles.total)}>
                <span className={styles.rk}>Net yield / ROI</span>
                <span className={styles.rv}>
                  {data.financials.yieldPct} / {data.financials.roiPct}
                </span>
              </div>

              <h2 style={{ marginTop: 22 }}>Potential renovation</h2>
              {data.renovation && data.renovation.items.length > 0 ? (
                <>
                  {data.renovation.items.map((item) => (
                    <div className={styles.rrow} key={item.label}>
                      <span className={styles.rk} title={item.rationale}>
                        {item.label}
                      </span>
                      <span className={styles.rv}>
                        {fmtMoney(item.low)}–{fmtMoney(item.high)}
                      </span>
                    </div>
                  ))}
                  <div className={clsx(styles.rrow, styles.total)}>
                    <span className={styles.rk}>Estimated total</span>
                    <span className={styles.rv}>
                      {fmtMoney(data.renovation.totalLow)}–{fmtMoney(data.renovation.totalHigh)}
                    </span>
                  </div>
                  <div className={styles.renoNote}>
                    Estimates as of {data.renovation.asOf}. {data.renovation.note}
                  </div>
                </>
              ) : (
                <div className={styles.rrow}>
                  <span className={styles.rk}>Potential renovation</span>
                  <span className={styles.rv}>not available for this listing</span>
                </div>
              )}
            </div>

            <div className={styles.panelBlock} style={{ marginBottom: 0 }}>
              <h2>Comparable sales</h2>
              {data.comparables.map((c) => (
                <div className={styles.compRow} key={c[0]}>
                  <span className={styles.crAddr}>{c[0]}</span>
                  <span className={styles.crPrice}>{c[1]}</span>
                </div>
              ))}

              <h2 style={{ marginTop: 22 }}>Strategy scores</h2>
              <div className={styles.rrow}>
                <span className={styles.rk}>Buy-to-Let</span>
                <span className={styles.rv}>{data.strategy.btl} / 100</span>
              </div>
              <div className={styles.rrow}>
                <span className={styles.rk}>BRRR</span>
                <span className={styles.rv}>{data.strategy.brrr} / 100</span>
              </div>
              <div className={styles.rrow}>
                <span className={styles.rk}>Flip</span>
                <span className={styles.rv}>{data.strategy.flip} / 100</span>
              </div>

              <h2 style={{ marginTop: 22 }}>Local crime</h2>
              {dq?.crimeDataAvailable ? (
                <>
                  <div className={styles.rrow}>
                    <span className={styles.rk}>Recorded crimes ({dq.crimeMonth || 'latest month'})</span>
                    <span className={styles.rv}>{dq.crimeTotalCount}</span>
                  </div>
                  {dq.crimeTopCategories && dq.crimeTopCategories.length > 0 && (
                    <div className={styles.rrow}>
                      <span className={styles.rk}>Most common</span>
                      <span className={styles.rv}>
                        {dq.crimeTopCategories
                          .slice(0, 2)
                          .map((c) => c.category)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                  {dq.crimeTrendAvailable && dq.crimeTrendChangePct != null && (
                    <div className={styles.rrow}>
                      <span className={styles.rk}>Year-on-year</span>
                      <span
                        className={clsx(
                          styles.rv,
                          dq.crimeTrendChangePct <= -20
                            ? styles.crimeTrendGood
                            : dq.crimeTrendChangePct >= 20
                              ? styles.crimeTrendBad
                              : styles.crimeTrendNeutral
                        )}
                      >
                        {dq.crimeTrendChangePct > 0 ? 'up' : dq.crimeTrendChangePct < 0 ? 'down' : 'flat'}{' '}
                        {Math.abs(dq.crimeTrendChangePct).toFixed(0)}%
                      </span>
                    </div>
                  )}
                  <div className={styles.crimeNote}>
                    {dq.crimeRadiusNote || 'within a fixed ~1 mile radius'} · {dq.crimeSource || 'data.police.uk'}
                    {dq.crimeTrendAvailable ? ' · trend compares the same area to the same month last year' : ''}
                  </div>
                </>
              ) : (
                <div className={styles.rrow}>
                  <span className={styles.rk}>Local crime</span>
                  <span className={styles.rv}>unavailable for this listing</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.panelBlock}>
            <h2>Strengths &amp; risks</h2>
            <div className={styles.strengthsRisks}>
              <div>
                <div className={clsx(styles.srTitle, styles.good)}>Why it scored the way it did</div>
                <ul className={styles.srList}>
                  {data.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className={clsx(styles.srTitle, styles.bad)}>Risks identified</div>
                <ul className={styles.srList}>
                  {data.risks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AnalysePage() {
  return (
    <Suspense fallback={null}>
      <AnalysePageInner />
    </Suspense>
  );
}
