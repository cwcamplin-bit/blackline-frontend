'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * Generic scroll-reveal wrapper — mirrors the landing page's original
 * IntersectionObserver-driven `.observe` / `.in-view` pattern. Once an
 * instance scrolls into view it stays revealed (matches the original: no
 * un-reveal on scroll away).
 */
export default function Reveal({
  className,
  activeClassName,
  threshold = 0.15,
  children,
}: {
  className?: string;
  activeClassName?: string;
  threshold?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={clsx(className, inView && activeClassName)}>
      {children}
    </div>
  );
}
