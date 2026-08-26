'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthLayout, { authStyles as s } from '@/components/AuthLayout';
import { ApiError, resetPassword } from '@/lib/api';
import clsx from 'clsx';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(true);
      setMsg('This reset link is missing its token — please use the link from your email.');
      return;
    }
    if (newPw.length < 8) {
      setError(true);
      setMsg('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setError(true);
      setMsg("New password and confirmation don't match.");
      return;
    }
    setError(false);
    setSubmitting(true);
    try {
      await resetPassword(token, newPw);
      setDone(true);
      setMsg('Password updated — you can log in with your new password now.');
      setTimeout(() => router.push('/login'), 2200);
    } catch (err) {
      setError(true);
      if (err instanceof ApiError && err.status === 400) {
        setMsg('This reset link is invalid or has expired — request a new one below.');
      } else {
        setMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      accent="gold"
      brandEyebrow="ACCOUNT RECOVERY"
      brandQuote={<>Choose a new password to get back into your account.</>}
      brandContent={<div />}
      navCta={
        <Link href="/login" className="btn btn-ghost">
          Back to log in
        </Link>
      }
    >
      <div className="eyebrow">
        <span className="el" />
        RESET PASSWORD
      </div>
      <h2>Choose a new password.</h2>
      <p className={s.sub}>Use at least 8 characters.</p>

      {!done && (
        <form onSubmit={handleSubmit} noValidate>
          <div className={s.field}>
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
          <div className={s.field}>
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
          <button type="submit" className={s.authSubmit} disabled={submitting}>
            {submitting ? 'Updating…' : 'Reset password →'}
          </button>
          <div className={clsx(s.authMsg, error && s.error)}>{msg}</div>
          {error && (
            <div className={s.authSwitch}>
              <Link href="/forgot-password">Request a new reset link</Link>
            </div>
          )}
        </form>
      )}
      {done && <div className={s.authMsg}>{msg}</div>}
    </AuthLayout>
  );
}
