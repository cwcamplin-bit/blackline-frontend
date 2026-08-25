'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth';
import { createBillingPortalSession, createCheckoutSession, type BillingInterval, type PlanId } from '@/lib/api';
import styles from './plans.module.css';

// Kept in sync with the backend README's Stripe setup steps and the
// Account page's own PLAN_PRICES — the annual figures are ~15% off the
// monthly rate over a year (£29 x 12 x 0.85 ≈ £296, rounded to £299; £99 x
// 12 x 0.85 ≈ £1010, rounded to £999). If the actual Prices set up in
// Stripe differ from these, update both this file and the two env vars
// (STRIPE_PRICE_PRO_ANNUAL / STRIPE_PRICE_PROFESSIONAL_ANNUAL) to match —
// this page's copy doesn't read the real amount from Stripe, since
// Checkout Sessions are created server-side from the price ID alone.
const PLAN_PRICING: Record<PlanId, { monthly: number; annual: number }> = {
  pro: { monthly: 29, annual: 299 },
  professional: { monthly: 99, annual: 999 },
};

const TIERS: Array<{
  id: 'free' | PlanId;
  name: string;
  tag: string;
  description: string;
  features: string[];
}> = [
  {
    id: 'free',
    name: 'Free',
    tag: 'FOR YOUR FIRST FEW DEALS',
    description:
      'Run the full Blackline investment analysis on any Rightmove listing — no account needed to try it, no card required.',
    features: [
      'Up to 5 property analyses a day',
      'Full verdict, scores & financial breakdown',
      'Comparable sales & rental estimates',
      'Sign up to save results and build history',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tag: 'FOR ACTIVE INVESTORS',
    description:
      'For investors reviewing deals regularly — unlimited analyses, saved properties and a running history of everything you’ve looked at.',
    features: [
      'Unlimited property analyses',
      'Saved properties & full analysis history',
      'Watchlists for tracking deals over time',
      'Everything in Free',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    tag: 'FOR INVESTORS ANALYSING WEEKLY',
    description:
      'For portfolio landlords and professionals who need the full toolkit — side-by-side comparisons and first access to new capabilities.',
    features: [
      'Everything in Pro',
      'Side-by-side property comparison',
      'Priority support',
      'First access to new premium capabilities',
    ],
  },
];

function formatPrice(amount: number, billingInterval: BillingInterval): string {
  return billingInterval === 'monthly' ? `£${amount}/mo` : `£${amount}/yr`;
}

export default function PlansPage() {
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [busy, setBusy] = useState<PlanId | 'portal' | null>(null);
  const [error, setError] = useState('');

  async function handlePurchase(plan: PlanId) {
    setError('');
    setBusy(plan);
    try {
      const url = await createCheckoutSession(plan, billingInterval, '/account');
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
      setBusy(null);
    }
  }

  async function handleSwitchViaPortal() {
    setError('');
    setBusy('portal');
    try {
      const url = await createBillingPortalSession('/plans');
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the billing portal. Please try again.');
      setBusy(null);
    }
  }

  // A signed-in user with an existing paid subscription changes plan or
  // billing interval through Stripe's own Billing Portal, not a second
  // Checkout Session — starting a new subscription here while one is
  // already active would leave the customer with two, rather than
  // switching the existing one. The Account page re-fetches the user (and
  // shows the updated plan) once they land back there.
  const hasActiveSubscription = user?.plan !== 'free' && user?.plan !== undefined;

  return (
    <div className={styles.main}>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          PLANS
        </div>
        <h1>Find the right plan.</h1>
        <p className={styles.sub}>
          Every plan includes the full Blackline analysis engine — verdicts, scores, comparables and financials.
          Upgrade for unlimited analyses and the tools to manage a growing portfolio.
        </p>
      </div>

      <div className={styles.toggleRow}>
        <span className={clsx(styles.toggleLabel, billingInterval === 'monthly' && styles.active)}>Monthly</span>
        <button
          type="button"
          className={styles.toggleSwitch}
          role="switch"
          aria-checked={billingInterval === 'annual'}
          aria-label="Toggle monthly/annual billing"
          onClick={() => setBillingInterval((i) => (i === 'monthly' ? 'annual' : 'monthly'))}
        >
          <span className={styles.tTrack}>
            <span className={clsx(styles.tThumb, billingInterval === 'annual' && styles.annual)} />
          </span>
        </button>
        <span className={clsx(styles.toggleLabel, billingInterval === 'annual' && styles.active)}>Annual</span>
        <span className={styles.saveBadge}>Save ~15%</span>
      </div>

      <div className={styles.grid}>
        {TIERS.map((tier) => {
          const isPaid = tier.id !== 'free';
          const isCurrentPlan = user?.plan === tier.id;
          const pricing = isPaid ? PLAN_PRICING[tier.id as PlanId] : null;

          return (
            <div key={tier.id} className={clsx(styles.card, tier.id === 'professional' && styles.featured)}>
              <div className={styles.tierName}>{tier.name}</div>
              <div className={styles.tierTag}>{tier.tag}</div>
              <p className={styles.tierDesc}>{tier.description}</p>

              <div className={styles.priceRow}>
                {pricing ? (
                  <>
                    <span className={styles.priceVal}>{formatPrice(pricing[billingInterval], billingInterval)}</span>
                    {billingInterval === 'annual' && (
                      <div className={styles.priceNote}>
                        vs {formatPrice(pricing.monthly * 12, 'annual')} billed monthly
                      </div>
                    )}
                  </>
                ) : (
                  <span className={styles.priceVal}>£0</span>
                )}
              </div>

              <ul className={styles.features}>
                {tier.features.map((f) => (
                  <li key={f}>
                    <span>—</span>
                    {f}
                  </li>
                ))}
              </ul>

              {tier.id === 'free' ? (
                isCurrentPlan || !user ? (
                  <div className={styles.currentBadge}>Your current plan</div>
                ) : (
                  <button type="button" className="btn btn-ghost" onClick={handleSwitchViaPortal} disabled={busy !== null}>
                    {busy === 'portal' ? 'Opening…' : 'Downgrade via billing portal'}
                  </button>
                )
              ) : isCurrentPlan ? (
                <div className={styles.currentBadge}>Your current plan</div>
              ) : hasActiveSubscription ? (
                <button
                  type="button"
                  className={tier.id === 'professional' ? 'btn btn-gold' : 'btn btn-ghost'}
                  onClick={handleSwitchViaPortal}
                  disabled={busy !== null}
                >
                  {busy === 'portal' ? 'Opening…' : 'Switch via billing portal'}
                </button>
              ) : (
                <button
                  type="button"
                  className={tier.id === 'professional' ? 'btn btn-gold' : 'btn btn-ghost'}
                  onClick={() => handlePurchase(tier.id as PlanId)}
                  disabled={busy !== null}
                >
                  {busy === tier.id ? 'Redirecting…' : 'Purchase'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}
    </div>
  );
}
