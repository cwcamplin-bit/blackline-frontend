import type { Verdict } from './types';

// Small shared helpers for turning a verdict into the right CSS modifier
// class name / dot class — used by Saved, History, Portfolio and Analyse.
export const VERDICT_PILL_CLASS: Record<Verdict, string> = {
  strongbuy: 'pillStrongbuy',
  buy: 'pillBuy',
  invest: 'pillInvest',
  caution: 'pillCaution',
  pass: 'pillPass',
};

export const VERDICT_DOT_CLASS: Record<Verdict, string> = {
  strongbuy: 'dot-strongbuy',
  buy: 'dot-buy',
  invest: 'dot-invest',
  caution: 'dot-caution',
  pass: 'dot-pass',
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  strongbuy: 'Strong Buy',
  buy: 'Buy',
  invest: 'Investigate Further',
  caution: 'Proceed with Caution',
  pass: 'Pass',
};
