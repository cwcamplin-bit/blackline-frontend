'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthLayout, { authStyles as s } from '@/components/AuthLayout';
import { useAuth } from '@/lib/auth';
import { verifyEmail } from '@/lib/api';
import clsx from 'clsx';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { user, refreshMe } = useAuth();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  // Verification tokens are single-use (see consume_auth_token in db.py) —
  // React 18/19's Strict Mode runs effects twice in development, which
  // would otherwise burn the token on its first (thrown-away) run and
  // show "invalid or expired" on the second, real one. This ref makes the
  // actual API call fire at most once per page load regardless.
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    if (calledRef.current) return;
    calledRef.current = true;
    verifyEmail(token)
      .then(() => {
        setStatus('success');
        // If this browser also happens to be logged in as the account
        // that just verified, refresh so the "unverified" banner on
        // Account/elsewhere clears immediately rather than on next login.
        if (user) refreshMe();
      })
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthLayout
      accent="teal"
      brandEyebrow="EMAIL VERIFICATION"
      brandQuote={<>Confirming your email address.</>}
      brandContent={<div />}
      navCta={
        <Link href="/login" className="btn btn-ghost">
          Log in
        </Link>
      }
    >
      <div className="eyebrow">
        <span className="el" />
        VERIFY EMAIL
      </div>
      <h2>
        {status === 'checking' && 'Verifying…'}
        {status === 'success' && 'Email verified.'}
        {status === 'error' && "Couldn't verify that link."}
      </h2>
      <div className={clsx(s.authMsg, status === 'error' && s.error)} style={{ marginTop: 4 }}>
        {status === 'checking' && 'One moment while we confirm this link.'}
        {status === 'success' && 'Your email address is now verified. You can close this tab or head back in.'}
        {status === 'error' &&
          'This verification link is invalid or has expired. Log in and use "Resend verification email" from your Account page to get a new one.'}
      </div>

      <div className={s.authDivider}>
        <span>&nbsp;</span>
      </div>
      <div className={s.authSwitch}>
        <Link href="/analyse">Go to Blackline →</Link>
      </div>
    </AuthLayout>
  );
}
