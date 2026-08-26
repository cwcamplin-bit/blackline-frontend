'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout, { authStyles as s } from '@/components/AuthLayout';
import { forgotPassword } from '@/lib/api';
import clsx from 'clsx';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError(true);
      setMsg('Enter your email address to continue.');
      return;
    }
    setError(false);
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      // The backend always returns success here regardless of whether the
      // email has an account — see forgot_password()'s docstring in
      // routes_auth.py — so this message is deliberately the same either
      // way, rather than confirming/denying an account exists.
      setDone(true);
      setMsg("If an account exists for that email, we've sent a link to reset your password.");
    } catch (err) {
      setError(true);
      setMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      accent="gold"
      brandEyebrow="ACCOUNT RECOVERY"
      brandQuote={
        <>
          Every property you&apos;ve analysed is exactly where you left it —
          <br />
          <span className={s.g}>you just need to get back in.</span>
        </>
      }
      brandContent={<div />}
      navCta={
        <Link href="/login" className="btn btn-ghost">
          Back to log in
        </Link>
      }
    >
      <div className="eyebrow">
        <span className="el" />
        FORGOT PASSWORD
      </div>
      <h2>Reset your password.</h2>
      <p className={s.sub}>Enter the email address on your account and we&apos;ll send you a reset link.</p>

      {!done && (
        <form onSubmit={handleSubmit} noValidate>
          <div className={s.field}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className={s.authSubmit} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link →'}
          </button>
          <div className={clsx(s.authMsg, error && s.error)}>{msg}</div>
        </form>
      )}
      {done && <div className={s.authMsg}>{msg}</div>}

      <div className={s.authDivider}>
        <span>Remembered it after all</span>
      </div>
      <div className={s.authSwitch}>
        <Link href="/login">Log in</Link>
      </div>
    </AuthLayout>
  );
}
