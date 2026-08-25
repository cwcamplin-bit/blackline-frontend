'use client';

import Link from 'next/link';
import clsx from 'clsx';
import ThemeToggle from './ThemeToggle';
import styles from './AuthLayout.module.css';

export default function AuthLayout({
  navCta,
  accent,
  brandEyebrow,
  brandQuote,
  brandContent,
  children,
}: {
  navCta: React.ReactNode;
  accent: 'gold' | 'teal';
  brandEyebrow: string;
  brandQuote: React.ReactNode;
  brandContent: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className={styles.navHeader}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.wordmark}>
            BLACK<span className={styles.lined}>LINE</span>
          </Link>
          <div className={styles.navRight}>
            <ThemeToggle />
            <div className={styles.navCta}>{navCta}</div>
          </div>
        </div>
      </header>

      <div className={styles.authShell}>
        <div className={clsx(styles.authBrand, accent === 'teal' && styles.authBrandTeal)}>
          <div>
            <div className="eyebrow">
              <span className="el" />
              {brandEyebrow}
            </div>
            <div className={styles.authQuote}>{brandQuote}</div>
          </div>
          {brandContent}
        </div>

        <div className={styles.authFormWrap}>
          <div className={styles.authCard}>{children}</div>
        </div>
      </div>

      <footer className={styles.pageFooter}>
        <p>© 2026 Blackline — The AI Operating System for Property Investors.</p>
      </footer>
    </>
  );
}

export { styles as authStyles };
