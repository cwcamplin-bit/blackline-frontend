'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './InvestmentDiamond.module.css';

export interface DiamondScores {
  growth: number;
  valueAdd: number;
  security: number;
  cashflow: number;
}

type Axis = 'top' | 'right' | 'bottom' | 'left';

function pointOnAxis(score: number, axis: Axis, radiusFn: (s: number) => number) {
  const r = radiusFn(score);
  if (axis === 'top') return { x: 200, y: 200 - r };
  if (axis === 'right') return { x: 200 + r, y: 200 };
  if (axis === 'bottom') return { x: 200, y: 200 + r };
  return { x: 200 - r, y: 200 };
}

// Matches analyse.html's pointOnAxis: 60..140 distance from center, tuned
// to the fixed ring geometry below.
export const productRadiusFn = (score: number) => 60 + (score / 100) * 80;
// Matches the marketing landing page's hand-tuned hero/engine diamonds
// (a different, purely illustrative scale — r = 1.4 * score).
export const marketingRadiusFn = (score: number) => score * 1.4;

/**
 * The "Investment DNA" radar chart — four axes (Growth/top, Value Add/right,
 * Security/bottom, Cashflow/left), reused by the Analyse report and the two
 * illustrative diamonds on the marketing landing page. The two call sites
 * historically used slightly different radius scaling (see radiusFn above),
 * preserved here rather than unified, so neither page's visuals change.
 */
export default function InvestmentDiamond({
  scores,
  radiusFn = productRadiusFn,
  trigger = 'immediate',
  maxWidth,
  ariaLabel,
}: {
  scores: DiamondScores;
  radiusFn?: (score: number) => number;
  trigger?: 'immediate' | 'onVisible';
  maxWidth?: string;
  ariaLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);
  const [displayed, setDisplayed] = useState({ growth: 0, valueAdd: 0, security: 0, cashflow: 0 });

  useEffect(() => {
    if (trigger === 'immediate') {
      const t = setTimeout(() => setAnimated(true), 150);
      return () => clearTimeout(t);
    }
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setAnimated(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trigger]);

  useEffect(() => {
    if (!animated) return;
    const start = performance.now();
    const duration = 1100;
    let raf: number;
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayed({
        growth: Math.round(eased * scores.growth),
        valueAdd: Math.round(eased * scores.valueAdd),
        security: Math.round(eased * scores.security),
        cashflow: Math.round(eased * scores.cashflow),
      });
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animated, scores.growth, scores.valueAdd, scores.security, scores.cashflow]);

  const top = pointOnAxis(scores.growth, 'top', radiusFn);
  const right = pointOnAxis(scores.valueAdd, 'right', radiusFn);
  const bottom = pointOnAxis(scores.security, 'bottom', radiusFn);
  const left = pointOnAxis(scores.cashflow, 'left', radiusFn);
  const points = `${top.x},${top.y} ${right.x},${right.y} ${bottom.x},${bottom.y} ${left.x},${left.y}`;

  return (
    <div ref={containerRef}>
      <svg
        className={styles.diamond}
        style={maxWidth ? { maxWidth } : undefined}
        viewBox="0 0 400 400"
        role="img"
        aria-label={ariaLabel ?? 'Investment profile radar chart'}
      >
        <polygon className={styles.dRing} points="200,165 235,200 200,235 165,200" />
        <polygon className={styles.dRing} points="200,130 270,200 200,270 130,200" />
        <polygon className={styles.dRing} points="200,95 305,200 200,305 95,200" />
        <polygon className={styles.dRing} points="200,60 340,200 200,340 60,200" />
        <line className={styles.dAxis} x1="200" y1="200" x2="200" y2="60" />
        <line className={styles.dAxis} x1="200" y1="200" x2="340" y2="200" />
        <line className={styles.dAxis} x1="200" y1="200" x2="200" y2="340" />
        <line className={styles.dAxis} x1="200" y1="200" x2="60" y2="200" />
        <polygon className={`${styles.dPoly} ${animated ? styles.animateIn : ''}`} points={points} />
        <circle className={styles.dDot} cx={top.x} cy={top.y} r={3.5} />
        <circle className={styles.dDot} cx={right.x} cy={right.y} r={3.5} />
        <circle className={styles.dDot} cx={bottom.x} cy={bottom.y} r={3.5} />
        <circle className={styles.dDot} cx={left.x} cy={left.y} r={3.5} />
        <text className={styles.dLabel} x={200} y={40} textAnchor="middle">
          Growth
        </text>
        <text className={styles.dNum} x={200} y={24} textAnchor="middle">
          {displayed.growth}
        </text>
        <text className={styles.dLabel} x={345} y={196} textAnchor="start">
          Value Add
        </text>
        <text className={styles.dNum} x={345} y={216} textAnchor="start">
          {displayed.valueAdd}
        </text>
        <text className={styles.dLabel} x={200} y={372} textAnchor="middle">
          Security
        </text>
        <text className={styles.dNum} x={200} y={392} textAnchor="middle">
          {displayed.security}
        </text>
        <text className={styles.dLabel} x={55} y={196} textAnchor="end">
          Cashflow
        </text>
        <text className={styles.dNum} x={55} y={216} textAnchor="end">
          {displayed.cashflow}
        </text>
      </svg>
    </div>
  );
}
