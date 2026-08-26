'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import * as api from '@/lib/api';
import type { CreateHoldingInput } from '@/lib/api';
import type { PortfolioHolding } from '@/lib/types';
import styles from './portfolio.module.css';

function fmtMoney(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB');
}
function fmtSignedMoney(n: number): string {
  const rounded = Math.round(n);
  return (rounded >= 0 ? '+£' : '-£') + Math.abs(rounded).toLocaleString('en-GB');
}
function equity(h: PortfolioHolding): number {
  return h.currentValue - h.mortgageBalance;
}
function cashflow(h: PortfolioHolding): number {
  return h.monthlyRent - h.monthlyCosts;
}
function yieldPct(h: PortfolioHolding): number {
  return h.currentValue > 0 ? (h.monthlyRent * 12 * 100) / h.currentValue : 0;
}

const BLANK_FORM = {
  address: '',
  purchasePrice: '',
  currentValue: '',
  mortgageBalance: '',
  monthlyRent: '',
  monthlyCosts: '',
  purchasedAt: '',
};
type FormState = typeof BLANK_FORM;

function toInput(input: CreateHoldingInput | null): FormState {
  if (!input) return BLANK_FORM;
  return {
    address: input.address,
    purchasePrice: String(input.purchasePrice),
    currentValue: String(input.currentValue),
    mortgageBalance: String(input.mortgageBalance),
    monthlyRent: String(input.monthlyRent),
    monthlyCosts: String(input.monthlyCosts),
    purchasedAt: input.purchasedAt || '',
  };
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function load() {
    return api
      .listPortfolioHoldings()
      .then((rows) => {
        setHoldings(rows);
        setLoadError('');
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load your portfolio.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openAddForm() {
    setEditingId(null);
    setForm(BLANK_FORM);
    setFormError('');
    setFormOpen(true);
  }

  function openEditForm(h: PortfolioHolding) {
    setEditingId(h.id);
    setForm(
      toInput({
        address: h.address,
        purchasePrice: h.purchasePrice,
        currentValue: h.currentValue,
        mortgageBalance: h.mortgageBalance,
        monthlyRent: h.monthlyRent,
        monthlyCosts: h.monthlyCosts,
        purchasedAt: h.purchasedAt,
      })
    );
    setFormError('');
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address.trim() || !form.purchasePrice || !form.currentValue) {
      setFormError('Address, purchase price and current value are required.');
      return;
    }
    const payload: CreateHoldingInput = {
      address: form.address.trim(),
      purchasePrice: Number(form.purchasePrice) || 0,
      currentValue: Number(form.currentValue) || 0,
      mortgageBalance: Number(form.mortgageBalance) || 0,
      monthlyRent: Number(form.monthlyRent) || 0,
      monthlyCosts: Number(form.monthlyCosts) || 0,
      purchasedAt: form.purchasedAt || null,
    };
    setSaving(true);
    setFormError('');
    try {
      if (editingId != null) {
        await api.updatePortfolioHolding(editingId, payload);
      } else {
        await api.createPortfolioHolding(payload);
      }
      await load();
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this property.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(h: PortfolioHolding) {
    if (!window.confirm(`Remove "${h.address}" from your portfolio?`)) return;
    setHoldings((prev) => prev.filter((x) => x.id !== h.id));
    api.deletePortfolioHolding(h.id).catch(() => load());
  }

  const totalEquity = holdings.reduce((sum, h) => sum + equity(h), 0);
  const totalCashflow = holdings.reduce((sum, h) => sum + cashflow(h), 0);
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalAnnualRent = holdings.reduce((sum, h) => sum + h.monthlyRent * 12, 0);
  const portfolioYield = totalValue > 0 ? (totalAnnualRent * 100) / totalValue : 0;

  // Rule-based, computed straight from what's been entered — no market feed
  // or AI model behind this yet, so the copy doesn't claim one.
  const insights: { tone: 'opp' | 'warn' | 'info'; title: string; body: string }[] = [];
  const negativeCashflow = holdings.filter((h) => cashflow(h) < 0);
  if (negativeCashflow.length > 0) {
    const worst = negativeCashflow.reduce((a, b) => (cashflow(a) < cashflow(b) ? a : b));
    insights.push({
      tone: 'warn',
      title: 'Negative cashflow',
      body: `${worst.address} is running ${fmtSignedMoney(cashflow(worst))}/mo — rent isn't covering costs.`,
    });
  }
  const refinanceable = holdings
    .map((h) => ({ h, releasable: h.currentValue * 0.75 - h.mortgageBalance }))
    .filter((x) => x.releasable > 5000)
    .sort((a, b) => b.releasable - a.releasable)[0];
  if (refinanceable) {
    insights.push({
      tone: 'opp',
      title: 'Refinance headroom',
      body: `${refinanceable.h.address} has roughly ${fmtMoney(refinanceable.releasable)} releasable at 75% LTV.`,
    });
  }
  if (holdings.length > 0) {
    const best = [...holdings].sort((a, b) => yieldPct(b) - yieldPct(a))[0];
    insights.push({
      tone: 'info',
      title: 'Best-performing yield',
      body: `${best.address} is running at ${yieldPct(best).toFixed(1)}% gross yield, your strongest holding.`,
    });
  }

  return (
    <>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          PORTFOLIO
        </div>
        <h1>Your portfolio.</h1>
        <p className={styles.sub}>
          Properties you own, with equity, cashflow and yield tracked from the numbers you enter — no valuation feed
          behind this yet, so keep current value and mortgage balance up to date yourself.
        </p>
        {loadError && <p className={styles.sub} style={{ color: 'var(--red, #c0392b)' }}>{loadError}</p>}
      </div>

      {!loading && holdings.length === 0 && !formOpen && (
        <div className={styles.panelBlock} style={{ marginBottom: 24 }}>
          <h2>No properties yet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 18 }}>
            Add a property you own to start tracking its equity, cashflow and yield here.
          </p>
          <button type="button" className="btn btn-gold" onClick={openAddForm}>
            + Add property
          </button>
        </div>
      )}

      {holdings.length > 0 && (
        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <div className={styles.scNum}>{holdings.length}</div>
            <div className={styles.scLabel}>Properties owned</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.scNum}>{fmtMoney(totalEquity)}</div>
            <div className={styles.scLabel}>Total equity</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.scNum}>{fmtSignedMoney(totalCashflow)}</div>
            <div className={styles.scLabel}>Monthly cashflow</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.scNum}>{portfolioYield.toFixed(1)}%</div>
            <div className={styles.scLabel}>Portfolio yield</div>
          </div>
        </div>
      )}

      {(holdings.length > 0 || formOpen) && (
        <div className={styles.sectionTitleRow}>
          <h2 style={{ margin: 0 }}>Holdings</h2>
          {!formOpen && (
            <button type="button" className="btn btn-ghost" onClick={openAddForm}>
              + Add property
            </button>
          )}
        </div>
      )}

      {formOpen && (
        <form className={styles.holdingForm} onSubmit={handleSubmit}>
          <div className={styles.holdingFormGrid}>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="h-address">Address</label>
              <input
                id="h-address"
                type="text"
                placeholder="e.g. 14 Ashworth Rd, Manchester"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="h-purchase">Purchase price (£)</label>
              <input
                id="h-purchase"
                type="number"
                min="0"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="h-value">Current value (£)</label>
              <input
                id="h-value"
                type="number"
                min="0"
                value={form.currentValue}
                onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="h-mortgage">Mortgage balance (£)</label>
              <input
                id="h-mortgage"
                type="number"
                min="0"
                value={form.mortgageBalance}
                onChange={(e) => setForm({ ...form, mortgageBalance: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="h-rent">Monthly rent (£)</label>
              <input
                id="h-rent"
                type="number"
                min="0"
                value={form.monthlyRent}
                onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="h-costs">Monthly costs (£)</label>
              <input
                id="h-costs"
                type="number"
                min="0"
                value={form.monthlyCosts}
                onChange={(e) => setForm({ ...form, monthlyCosts: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="h-date">Purchase date</label>
              <input
                id="h-date"
                type="date"
                value={form.purchasedAt}
                onChange={(e) => setForm({ ...form, purchasedAt: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.holdingFormActions}>
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? 'Saving…' : editingId != null ? 'Save changes' : 'Add property'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            {formError && <span className={styles.holdingFormError}>{formError}</span>}
          </div>
        </form>
      )}

      {holdings.length > 0 && (
        <div className={styles.twoCol}>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Equity</th>
                  <th>Cashflow</th>
                  <th>Yield</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const cf = cashflow(h);
                  return (
                    <tr key={h.id}>
                      <td className={styles.dtAddr}>{h.address}</td>
                      <td className={styles.monoCell}>{fmtMoney(equity(h))}</td>
                      <td className={clsx(styles.monoCell, cf >= 0 ? styles.pos : styles.neg)}>
                        {fmtSignedMoney(cf)}
                      </td>
                      <td className={styles.monoCell}>{yieldPct(h).toFixed(1)}%</td>
                      <td>
                        <span className={clsx(styles.statusTag, cf >= 0 ? styles.statusGood : styles.statusWarn)}>
                          {cf >= 0 ? 'Performing' : 'Underperforming'}
                        </span>
                      </td>
                      <td className={styles.rowActions}>
                        <button type="button" className={styles.rowActionBtn} onClick={() => openEditForm(h)}>
                          Edit
                        </button>
                        <button type="button" className={styles.rowActionBtn} onClick={() => handleDelete(h)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.panelBlock}>
            <h2>Portfolio insights</h2>
            {insights.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nothing to flag right now.</p>
            ) : (
              insights.map((ins) => (
                <div className={styles.insightRow} key={ins.title + ins.body}>
                  <span className={clsx(styles.irMark, styles[ins.tone])}>—</span>
                  <div>
                    <div className={styles.irTitle}>{ins.title}</div>
                    <div className={styles.irBody}>{ins.body}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
