'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout, { authStyles as s } from '@/components/AuthLayout';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import clsx from 'clsx';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError(true);
      setMsg('Fill in every field to create your account.');
      return;
    }
    if (password.length < 8) {
      setError(true);
      setMsg('Password must be at least 8 characters.');
      return;
    }
    if (!terms) {
      setError(true);
      setMsg('Please agree to the Terms of Service to continue.');
      return;
    }
    setError(false);
    setMsg('Creating your account…');
    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      router.push('/analyse');
    } catch (err) {
      setError(true);
      if (err instanceof ApiError && err.status === 409) {
        setMsg('An account with this email already exists — try logging in instead.');
      } else if (err instanceof ApiError && err.status === 503) {
        setMsg("Accounts aren't set up on the server yet — try again once that's configured.");
      } else if (err instanceof Error) {
        setMsg(err.message);
      } else {
        setMsg('Something went wrong creating your account. Please try again.');
      }
      setSubmitting(false);
    }
  }

  function handlePolicyClick(label: string) {
    setError(false);
    setMsg(`${label} page isn't built yet in this prototype.`);
  }

  return (
    <AuthLayout
      accent="teal"
      brandEyebrow="START FREE"
      brandQuote={
        <>
          Complex analysis.
          <br />
          <span className={s.g}>Simple decisions.</span>
        </>
      }
      brandContent={
        <div className={s.authChecklist}>
          <div className={s.authCheck}>
            <span className={s.acMark}>—</span>
            <span className={s.acLabel}>
              <b>Five free analyses.</b> No card required to get started.
            </span>
          </div>
          <div className={s.authCheck}>
            <span className={s.acMark}>—</span>
            <span className={s.acLabel}>
              <b>Institutional-grade reports</b> — financial modelling, comparables and AI reasoning in under 30
              seconds.
            </span>
          </div>
          <div className={s.authCheck}>
            <span className={s.acMark}>—</span>
            <span className={s.acLabel}>
              <b>Deterministic maths.</b> AI explains the verdict; it never invents the numbers.
            </span>
          </div>
          <div className={s.authCheck}>
            <span className={s.acMark}>—</span>
            <span className={s.acLabel}>
              <b>Works with Rightmove</b> listings today, Zoopla next.
            </span>
          </div>
        </div>
      }
      navCta={
        <>
          Already have an account?
          <Link href="/login" className="btn btn-ghost">
            Log in
          </Link>
        </>
      }
    >
      <div className="eyebrow">
        <span className="el" />
        SIGN UP
      </div>
      <h2>Create your account.</h2>
      <p className={s.sub}>Start with five free property analyses.</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className={s.field}>
          <label htmlFor="name">Full name</label>
          <input
            type="text"
            id="name"
            placeholder="Jane Kowalski"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={s.field}>
          <label htmlFor="signupEmail">Email</label>
          <input
            type="email"
            id="signupEmail"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={s.field}>
          <label htmlFor="signupPassword">Password</label>
          <input
            type="password"
            id="signupPassword"
            placeholder="••••••••••"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className={s.fieldHint}>At least 8 characters.</div>
        </div>
        <div className={s.checkRow}>
          <input
            type="checkbox"
            id="terms"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          <label htmlFor="terms">
            I agree to the{' '}
            <button type="button" onClick={() => handlePolicyClick('Terms of Service')}>
              Terms of Service
            </button>{' '}
            and{' '}
            <button type="button" onClick={() => handlePolicyClick('Privacy Policy')}>
              Privacy Policy
            </button>
            .
          </label>
        </div>
        <button type="submit" className={s.authSubmit} disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account →'}
        </button>
        <div className={clsx(s.authMsg, error && s.error)}>{msg}</div>
      </form>

      <div className={s.authDivider}>
        <span>Already a member</span>
      </div>
      <div className={s.authSwitch}>
        Already have an account? <Link href="/login">Log in</Link>
      </div>
    </AuthLayout>
  );
}
