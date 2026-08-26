'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as api from '@/lib/api';
import type { Watchlist } from '@/lib/types';
import styles from './watchlists.module.css';

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

export default function WatchlistsPage() {
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
    api
      .listWatchlists()
      .then((lists) => {
        if (!cancelled) setWatchlists(lists);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load your watchlists.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          WATCHLISTS
        </div>
        <h1>Your watchlists.</h1>
        <p className={styles.sub}>
          Standing searches that group matching properties — add to one from any analysis report.
        </p>
        {loadError && <p className={styles.sub} style={{ color: 'var(--red, #c0392b)' }}>{loadError}</p>}
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

      {watchlists.length === 0 && !creatingNew ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
          No watchlists yet — create one above, or add a property to one from any analysis report.
        </p>
      ) : (
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
                    <button type="button" className={styles.deleteBtn} onClick={() => handleDelete(w)}>
                      Delete
                    </button>
                    {wlMsg[String(w.id)] && <span className={styles.wlFormMsg}>{wlMsg[String(w.id)]}</span>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
