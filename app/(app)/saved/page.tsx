'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { PROPERTIES, type DemoSlug } from '@/lib/demoProperties';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import { readPrefs, removeSavedDemoSlug, hideDemoSaved as hideDemoSavedPref } from '@/lib/authPrefs';
import { VERDICT_DOT_CLASS, VERDICT_PILL_CLASS } from '@/lib/verdict';
import type { Watchlist } from '@/lib/types';
import styles from './saved.module.css';

// These four are always shown, matching the original prototype's always-on
// demo cards; the other three demo listings only appear once "saved" from
// a ?property= deep link on /analyse.
const ALWAYS_VISIBLE_DEMO: DemoSlug[] = ['ashworth', 'corporation', 'riverside', 'kings'];

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

function parseCriteria(raw: string): string[] {
  return raw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export default function SavedPage() {
  const { user, updatePrefs } = useAuth();
  const [savedProperties, setSavedProperties] = useState<api.SavedPropertyRow[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loadError, setLoadError] = useState('');

  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCriteria, setNewCriteria] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCriteria, setEditCriteria] = useState('');
  const [wlMsg, setWlMsg] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function loadWatchlists() {
    return api.listWatchlists().then(setWatchlists);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listSaved(), api.listWatchlists()])
      .then(([saved, lists]) => {
        if (cancelled) return;
        setSavedProperties(saved);
        setWatchlists(lists);
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

  function flashMsg(key: string, label: string) {
    setWlMsg((prev) => ({ ...prev, [key]: label }));
    setTimeout(() => {
      setWlMsg((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2600);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      await api.createWatchlist(newName.trim(), parseCriteria(newCriteria));
      await loadWatchlists();
      setCreatingNew(false);
      setNewName('');
      setNewCriteria('');
    } catch (err) {
      flashMsg('new', err instanceof api.ApiError && err.code === 'duplicate_name'
        ? 'You already have a watchlist with that name.'
        : 'Could not create that watchlist.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(w: Watchlist) {
    setEditingId(w.id);
    setEditName(w.name);
    setEditCriteria(w.criteria.join(', '));
  }

  async function handleUpdate(e: React.FormEvent, id: number) {
    e.preventDefault();
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      await api.updateWatchlist(id, { name: editName.trim(), criteria: parseCriteria(editCriteria) });
      await loadWatchlists();
      setEditingId(null);
    } catch (err) {
      flashMsg(String(id), err instanceof api.ApiError && err.code === 'duplicate_name'
        ? 'You already have a watchlist with that name.'
        : 'Could not save those changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(w: Watchlist) {
    if (!window.confirm(`Delete "${w.name}"? This also removes its ${w.matches.length} match(es).`)) return;
    setWatchlists((prev) => prev.filter((x) => x.id !== w.id));
    api.deleteWatchlist(w.id).catch(() => {
      flashMsg(String(w.id), 'Could not delete — try again.');
      loadWatchlists();
    });
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
        <h2>Watchlists ({watchlists.length})</h2>
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => {
            setCreatingNew((v) => !v);
            setEditingId(null);
          }}
        >
          {creatingNew ? 'Cancel' : '+ New watchlist'}
        </button>
      </div>

      {creatingNew && (
        <form className={styles.wlForm} onSubmit={handleCreate}>
          <div className={styles.wlFormRow}>
            <div className={styles.field}>
              <label htmlFor="new-wl-name">Name</label>
              <input
                id="new-wl-name"
                type="text"
                placeholder="e.g. Sheffield Student Lets"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={200}
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-wl-criteria">Criteria (comma-separated)</label>
              <input
                id="new-wl-criteria"
                type="text"
                placeholder="e.g. Yield > 7%, Under £180k"
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.wlFormActions}>
            <button type="submit" className="btn btn-gold" disabled={saving || !newName.trim()}>
              {saving ? 'Creating…' : 'Create watchlist'}
            </button>
            {wlMsg.new && <span className={styles.wlFormMsg}>{wlMsg.new}</span>}
          </div>
        </form>
      )}

      <div>
        {watchlists.map((w) => (
          <div className={styles.wlRow} key={w.id}>
            {editingId === w.id ? (
              <form className={styles.wlForm} style={{ flex: 1 }} onSubmit={(e) => handleUpdate(e, w.id)}>
                <div className={styles.wlFormRow}>
                  <div className={styles.field}>
                    <label htmlFor={`edit-name-${w.id}`}>Name</label>
                    <input
                      id={`edit-name-${w.id}`}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={200}
                      autoFocus
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`edit-criteria-${w.id}`}>Criteria (comma-separated)</label>
                    <input
                      id={`edit-criteria-${w.id}`}
                      type="text"
                      value={editCriteria}
                      onChange={(e) => setEditCriteria(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.wlFormActions}>
                  <button type="submit" className="btn btn-gold" disabled={saving || !editName.trim()}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                  {wlMsg[String(w.id)] && <span className={styles.wlFormMsg}>{wlMsg[String(w.id)]}</span>}
                </div>
              </form>
            ) : (
              <>
                <div>
                  <div className={styles.wlName}>{w.name}</div>
                  <div className={styles.wlChips}>
                    {w.criteria.length > 0 ? (
                      w.criteria.map((c) => (
                        <span className={styles.chip} key={c}>
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className={styles.chip}>No criteria set</span>
                    )}
                  </div>
                  {w.matches.length > 0 && (
                    <div className={styles.wlManualMatches}>
                      {w.matches.map((m) => (
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
                    style={w.matches.length === 0 ? { color: 'var(--text-faint)' } : undefined}
                  >
                    {w.matches.length === 0
                      ? 'No matches yet'
                      : `${w.matches.length} match${w.matches.length === 1 ? '' : 'es'}`}
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => startEdit(w)}>
                    Edit
                  </button>
                  <button type="button" className={styles.pcRemove} onClick={() => handleDelete(w)}>
                    Delete
                  </button>
                  {wlMsg[String(w.id)] && <span className={styles.wlFormMsg}>{wlMsg[String(w.id)]}</span>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
