'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ApiError, createBillingPortalSession, type PlanId } from '@/lib/api';
import styles from './account.module.css';

const PLAN_LABELS: Record<string, string> = { free: 'Free', pro: 'Pro', professional: 'Professional' };
// Only used for the *current, already-subscribed* plan's summary line below
// (e.g. "£299/yr · billed annually") — the upgrade CTAs themselves show no
// price at all now; that detail lives on /plans, which is also where the
// interval toggle (monthly/annual) lives. Keep in sync with the /plans
// page's own PLAN_PRICING and the backend README's Stripe setup steps.
const PLAN_PRICES: Record<PlanId, { monthly: string; annual: string }> = {
  pro: { monthly: '£29/mo', annual: '£299/yr' },
  professional: { monthly: '£99/mo', annual: '£999/yr' },
};
// Statuses where the subscription is still considered "in force" — anything
// else (past_due, unpaid, incomplete, canceled...) surfaces a billing
// warning pointing at the Manage billing portal, since Stripe's own
// dunning emails/retries are what actually try to collect payment.
const HEALTHY_STATUSES = new Set(['active', 'trialing']);

function MoonIcon() {
  return (
    <svg
      className={clsx(styles.tsIcon, styles.tsIconMoon)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className={clsx(styles.tsIcon, styles.tsIconSun)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

// useSearchParams() (used below for the post-Stripe-Checkout `?upgraded=1`
// redirect) requires a <Suspense> boundary around anything that calls it —
// without one, a statically-exported build (see next.config.ts's
// `output: 'export'`) fails outright rather than just warning, since
// there's no server left at request time to fall back to client-side
// rendering. AccountPage stays the default export Next.js expects; all the
// actual page content moved into AccountPageContent underneath it.
export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
  const [theme, toggleTheme] = useTheme();
  const { user, logout, updateProfile, changePassword, refreshMe } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [billingBusy, setBillingBusy] = useState<'portal' | null>(null);
  const [billingError, setBillingError] = useState('');
  const [showUpgradeNotice, setShowUpgradeNotice] = useState(false);

  const [fullName, setFullName] = useState(user?.name || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteLabel, setDeleteLabel] = useState('Delete account');

  // The (app) layout only renders this page once `user` is set, but keep
  // the field in sync if the underlying user object ever changes shape.
  useEffect(() => {
    if (user) setFullName(user.name);
  }, [user]);

  // Stripe redirects back here with ?upgraded=1 right after a successful
  // Checkout — the webhook that actually flips `plan` in the database can
  // take a moment to arrive, so this re-fetches the user (refreshMe) rather
  // than trusting the redirect alone, and shows a notice in case the plan
  // shown below hasn't updated by the time this renders.
  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      setShowUpgradeNotice(true);
      refreshMe();
      router.replace('/account');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleManageBilling() {
    setBillingError('');
    setBillingBusy('portal');
    try {
      const url = await createBillingPortalSession('/account');
      window.location.href = url;
    } catch (err) {
      setBillingError(
        err instanceof Error ? err.message : 'Could not open the billing portal. Please try again.'
      );
      setBillingBusy(null);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileMsg('Full name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile(fullName.trim());
      setProfileMsg('Profile changes saved.');
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Could not save your changes. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) {
      setPasswordError(true);
      setPasswordMsg('Fill in all three fields.');
      return;
    }
    if (newPw.length < 8) {
      setPasswordError(true);
      setPasswordMsg('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPasswordError(true);
      setPasswordMsg("New password and confirmation don't match.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPw, newPw);
      setPasswordError(false);
      setPasswordMsg('Password updated.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPasswordError(true);
      if (err instanceof ApiError && err.status === 401) {
        setPasswordMsg('Current password is incorrect.');
      } else {
        setPasswordMsg(err instanceof Error ? err.message : 'Could not update your password. Please try again.');
      }
    } finally {
      setSavingPassword(false);
    }
  }

  function handleDeleteClick() {
    setDeleteLabel("Account deletion isn't wired up in this prototype");
    setTimeout(() => setDeleteLabel('Delete account'), 2600);
  }

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <div className={styles.main}>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          ACCOUNT &amp; BILLING
        </div>
        <h1>Account settings.</h1>
        <p className={styles.sub}>Manage your profile, password and plan.</p>
      </div>

      <div className={styles.panelBlock}>
        <h2>Profile</h2>
        <div className={styles.phSub}>Your name and email appear on exported reports.</div>
        <form onSubmit={handleProfileSubmit} noValidate>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="fullName">Full name</label>
              <input
                type="text"
                id="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="emailAddr">Email</label>
              <input type="email" id="emailAddr" autoComplete="email" value={user?.email || ''} disabled readOnly />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className="btn btn-gold" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
            <span className={styles.formMsg}>{profileMsg}</span>
          </div>
        </form>
      </div>

      <div className={styles.panelBlock}>
        <h2>Appearance</h2>
        <div className={styles.phSub}>
          Switch Blackline between dark and light mode. This applies across the whole app.
        </div>
        <div className={styles.themeRow}>
          <div>
            <div className={styles.trlTitle}>{theme === 'light' ? 'Light mode' : 'Dark mode'}</div>
            <div className={styles.trlSub}>Currently using the {theme} theme.</div>
          </div>
          <button
            type="button"
            className={styles.themeSwitch}
            role="switch"
            aria-checked={theme === 'light'}
            aria-label="Toggle light/dark mode"
            onClick={toggleTheme}
          >
            <span className={styles.tsTrack}>
              <span className={clsx(styles.tsThumb, theme === 'light' && styles.light)}>
                <MoonIcon />
                <SunIcon />
              </span>
            </span>
          </button>
        </div>
      </div>

      <div className={styles.panelBlock}>
        <h2>Password</h2>
        <div className={styles.phSub}>Use at least 8 characters.</div>
        <form onSubmit={handlePasswordSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="currentPw">Current password</label>
            <input
              type="password"
              id="currentPw"
              placeholder="••••••••••"
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </div>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="newPw">New password</label>
              <input
                type="password"
                id="newPw"
                placeholder="••••••••••"
                autoComplete="new-password"
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="confirmPw">Confirm new password</label>
              <input
                type="password"
                id="confirmPw"
                placeholder="••••••••••"
                autoComplete="new-password"
                minLength={8}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className="btn btn-ghost" disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
            <span className={clsx(styles.formMsg, passwordError && styles.error)}>{passwordMsg}</span>
          </div>
        </form>
      </div>

      <div className={styles.panelBlock}>
        <h2>Plan</h2>
        <div className={styles.phSub}>
          You&apos;re currently on the {PLAN_LABELS[user?.plan ?? 'free'] || user?.plan} plan.
        </div>

        {showUpgradeNotice && (
          <div className={styles.planNotice}>
            Payment received — your plan updates within a few seconds. Refresh this page if it doesn&apos;t
            update automatically.
          </div>
        )}

        {user &&
          user.plan !== 'free' &&
          user.subscriptionStatus &&
          !HEALTHY_STATUSES.has(user.subscriptionStatus) && (
            <div className={clsx(styles.planNotice, styles.error)}>
              There&apos;s an issue with your billing ({user.subscriptionStatus.replace(/_/g, ' ')}) — use
              Manage billing below to update your payment method.
            </div>
          )}

        <div className={styles.planCard}>
          <div>
            <div className={styles.planName}>{PLAN_LABELS[user?.plan ?? 'free'] || user?.plan}</div>
            <div className={styles.planMeta}>
              {user?.plan === 'free'
                ? 'FOR YOUR FIRST FEW DEALS'
                : `${
                    PLAN_PRICES[user?.plan as PlanId][user?.subscriptionInterval === 'annual' ? 'annual' : 'monthly']
                  } · BILLED ${user?.subscriptionInterval === 'annual' ? 'ANNUALLY' : 'MONTHLY'}`}
            </div>
            {user?.plan === 'free' ? (
              <div className={styles.planUsage}>
                <div className={styles.usageTrack}>
                  <div className={styles.usageFill} />
                </div>
                <div className={styles.usageLabel}>Up to 5 free analyses a day — no account needed to run one</div>
              </div>
            ) : (
              <div className={styles.planUnlimited}>Unlimited property analyses</div>
            )}
          </div>

          {user?.plan === 'free' ? (
            <div className={styles.upgradeButtons}>
              <Link href="/plans" className="btn btn-gold">
                View plans &amp; upgrade →
              </Link>
            </div>
          ) : (
            <div className={styles.upgradeButtons}>
              <button
                type="button"
                className="btn btn-gold"
                onClick={handleManageBilling}
                disabled={billingBusy !== null}
              >
                {billingBusy === 'portal' ? 'Opening…' : 'Manage billing →'}
              </button>
              <Link href="/plans" className="btn btn-ghost">
                Compare plans
              </Link>
            </div>
          )}
        </div>

        {billingError && <div className={styles.billingError}>{billingError}</div>}

        <div className={styles.dangerRow}>
          <p>Log out of Blackline on this device. You can sign back in anytime.</p>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Log out →
          </button>
        </div>

        <div className={styles.dangerRow}>
          <p>Deleting your account permanently removes your saved properties, watchlists and history.</p>
          <button type="button" className={clsx('btn', styles.btnDanger)} onClick={handleDeleteClick}>
            {deleteLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
