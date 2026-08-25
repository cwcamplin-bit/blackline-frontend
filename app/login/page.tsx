'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthLayout, { authStyles as s } from '@/components/AuthLayout';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import clsx from 'clsx';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError(true);
      setMsg('Enter your email and password to continue.');
      return;
    }
    setError(false);
    setMsg('Logging in…');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push(searchParams.get('next') || '/analyse');
    } catch (err) {
      setError(true);
      if (err instanceof ApiError && err.status === 503) {
        setMsg("Accounts aren't set up on the server yet — try again once that's configured.");
      } else if (err instanceof Error) {
        setMsg(err.message);
      } else {
        setMsg('Something went wrong logging in. Please try again.');
      }
      setSubmitting(false);
    }
  }

  function handleForgot(e: React.MouseEvent) {
    e.preventDefault();
    setError(false);
    setMsg("Password reset isn't wired up in this prototype yet.");
  }

  return (
    <AuthLayout
      accent="gold"
      brandEyebrow="WELCOME BACK"
      brandQuote={
        <>
          Not <em>&quot;should I analyse this property?&quot;</em>
          <br />
          Just — <span className={s.g}>&quot;have I run it through Blackline yet?&quot;</span>
        </>
      }
      brandContent={
        <div className={s.authStats}>
          <div className={s.authStat}>
            <div className={s.asNum}>30s</div>
            <div className={s.asLabel}>From pasted listing to institutional-grade investment report.</div>
          </div>
          <div className={s.authStat}>
            <div className={s.asNum}>4</div>
            <div className={s.asLabel}>
              Independent dimensions — Cashflow, Growth, Value Add, Security — scored on every property.
            </div>
          </div>
          <div className={s.authStat}>
            <div className={s.asNum}>94%</div>
            <div className={s.asLabel}>Confidence rating shown alongside every verdict, never hidden.</div>
          </div>
        </div>
      }
      navCta={
        <>
          Don&apos;t have an account?
          <Link href="/signup" className="btn btn-gold">
            Sign up →
          </Link>
        </>
      }
    >
      <div className="eyebrow">
        <span className="el" />
        LOG IN
      </div>
      <h2>Welcome back.</h2>
      <p className={s.sub}>Every property you&apos;ve analysed is exactly where you left it.</p>

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
        <div className={s.fieldRow}>
          <div className={s.field}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="button" className={s.forgot} onClick={handleForgot}>
            Forgot?
          </button>
        </div>
        <button type="submit" className={s.authSubmit} disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in →'}
        </button>
        <div className={clsx(s.authMsg, error && s.error)}>{msg}</div>
      </form>

      <div className={s.authDivider}>
        <span>New to Blackline</span>
      </div>
      <div className={s.authSwitch}>
        Don&apos;t have an account? <Link href="/signup">Create one free</Link>
      </div>
    </AuthLayout>
  );
}
