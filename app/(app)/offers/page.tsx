'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import * as api from '@/lib/api';
import type { Offer, OfferStatus } from '@/lib/types';
import styles from './offers.module.css';

const STATUS_META: Record<OfferStatus, { label: string; tone: 'neutral' | 'active' | 'warn' | 'good' | 'bad' }> = {
  considering: { label: 'Considering', tone: 'neutral' },
  offered: { label: 'Offered', tone: 'active' },
  countered: { label: 'Countered', tone: 'warn' },
  accepted: { label: 'Accepted', tone: 'good' },
  rejected: { label: 'Rejected', tone: 'bad' },
  withdrawn: { label: 'Withdrawn', tone: 'bad' },
};

const STATUS_ORDER: OfferStatus[] = ['considering', 'offered', 'countered', 'accepted', 'rejected', 'withdrawn'];

function fmtPrice(n: number | null): string {
  return typeof n === 'number' ? '£' + n.toLocaleString('en-GB') : '—';
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editStatus, setEditStatus] = useState<OfferStatus>('considering');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    return api
      .listOffers()
      .then((rows) => {
        setOffers(rows);
        setLoadError('');
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load your offers.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(o: Offer) {
    setEditingId(o.id);
    setEditAmount(o.offerAmount != null ? String(o.offerAmount) : '');
    setEditStatus(o.status);
    setEditNotes(o.notes);
  }

  async function handleSave(e: React.FormEvent, id: number) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateOffer(id, {
        offerAmount: editAmount ? Number(editAmount) : null,
        status: editStatus,
        notes: editNotes,
      });
      await load();
      setEditingId(null);
    } catch {
      /* the form stays open on failure so the user can retry without re-typing */
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(o: Offer) {
    if (!window.confirm(`Stop tracking the offer on "${o.address}"?`)) return;
    setOffers((prev) => prev.filter((x) => x.id !== o.id));
    api.deleteOffer(o.id).catch(() => load());
  }

  return (
    <>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          OFFERS
        </div>
        <h1>Offers you&apos;re tracking.</h1>
        <p className={styles.sub}>
          Everything between &quot;analysed it&quot; and &quot;own it&quot; — negotiation status, amount and notes
          for each property you&apos;ve made or are considering an offer on.
        </p>
        {loadError && <p className={styles.sub} style={{ color: 'var(--red, #c0392b)' }}>{loadError}</p>}
      </div>

      {!loading && offers.length === 0 ? (
        <div className={styles.panelBlock}>
          <h2>No offers tracked yet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 18 }}>
            Analyse a property and use &quot;Track offer&quot; on its report to start tracking one here.
          </p>
          <Link href="/analyse" className="btn btn-gold">
            Analyse a property →
          </Link>
        </div>
      ) : (
        <div>
          {offers.map((o) => {
            const meta = STATUS_META[o.status];
            return (
              <div className={styles.offerRow} key={o.id}>
                {editingId === o.id ? (
                  <form className={styles.editForm} onSubmit={(e) => handleSave(e, o.id)}>
                    <div className={styles.editFormGrid}>
                      <div className={styles.field}>
                        <label htmlFor={`amount-${o.id}`}>Offer amount (£)</label>
                        <input
                          id={`amount-${o.id}`}
                          type="number"
                          min="0"
                          placeholder="Not yet offered"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor={`status-${o.id}`}>Status</label>
                        <select
                          id={`status-${o.id}`}
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as OfferStatus)}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_META[s].label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor={`notes-${o.id}`}>Notes</label>
                        <textarea
                          id={`notes-${o.id}`}
                          rows={3}
                          placeholder="e.g. Vendor open to quick completion, chain-free"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className={styles.editFormActions}>
                      <button type="submit" className="btn btn-gold" disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className={styles.offerMain}>
                      <div className={styles.offerAddr}>{o.address}</div>
                      <div className={styles.offerMeta}>
                        Asking {fmtPrice(o.price)}
                        {o.offerAmount != null && ` · Offered ${fmtPrice(o.offerAmount)}`}
                      </div>
                      {o.notes && <div className={styles.offerNotes}>{o.notes}</div>}
                    </div>
                    <div className={styles.offerRight}>
                      <span className={clsx(styles.statusPill, styles[meta.tone])}>{meta.label}</span>
                      <Link href={`/analyse?savedUrl=${encodeURIComponent(o.sourceUrl)}`} className={styles.offerLink}>
                        View report →
                      </Link>
                      <button type="button" className="btn btn-ghost" onClick={() => startEdit(o)}>
                        Edit
                      </button>
                      <button type="button" className={styles.offerRemove} onClick={() => handleDelete(o)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
