// Matches the live backend's response contract for POST /api/analyze, as
// documented in the project's "Front-end contract" notes. Also used for the
// illustrative PROPERTIES demo dataset (lib/demoProperties.ts), which omits
// the optional live-data-only fields (renovation, data_quality).

export type Verdict = 'strongbuy' | 'buy' | 'invest' | 'caution' | 'pass';

export interface Scores {
  growth: number;
  valueAdd: number;
  security: number;
  cashflow: number;
}

export interface Clauses {
  cashflow: string;
  growth: string;
  valueAdd: string;
  security: string;
}

export interface Financials {
  purchase: number;
  stampDuty: number;
  deposit: number;
  mortgage: number;
  rent: number;
  cashflow: number;
  yieldPct: string;
  roiPct: string;
}

export interface Strategy {
  btl: number;
  brrr: number;
  flip: number;
}

export type Comparable = [label: string, price: string];

export interface RenovationItem {
  label: string;
  low: number;
  high: number;
  rationale: string;
}

export interface RenovationEstimate {
  items: RenovationItem[];
  totalLow: number;
  totalHigh: number;
  asOf: string;
  note: string;
}

export interface CrimeTopCategory {
  category: string;
  count?: number;
}

export interface DataQuality {
  comparablesSource?: string;
  areaTrendAvailable?: boolean;
  areaTrendRegion?: string;
  areaTrendOneYearChangePct?: number;
  areaTrendFiveYearChangePct?: number;
  areaTrendAsOf?: string;
  areaTrendSource?: string;
  crimeDataAvailable?: boolean;
  crimeTotalCount?: number;
  crimeMonth?: string;
  crimeTopCategories?: CrimeTopCategory[];
  crimeRadiusNote?: string;
  crimeSource?: string;
  crimeTrendAvailable?: boolean;
  crimeTrendChangePct?: number | null;
  crimeTrendBaselineMonth?: string;
  crimeTrendBaselineCount?: number;
  crimeTrendNote?: string;
}

export interface AnalysisResult {
  address: string;
  price: number;
  beds: number;
  type: string;
  sourceUrl: string;
  verdict: Verdict;
  verdictLabel: string;
  confidence: number;
  scores: Scores;
  clauses: Clauses;
  financials: Financials;
  strategy: Strategy;
  comparables: Comparable[];
  strengths: string[];
  risks: string[];
  summary: string;
  renovation?: RenovationEstimate;
  assumptions?: Record<string, unknown>;
  data_quality?: DataQuality;
}

// A history-log entry is a full AnalysisResult plus the date it was analysed.
export interface HistoryEntry extends AnalysisResult {
  analysedDate: string;
}

export interface WatchlistMatch {
  address: string;
  price: number;
  verdictLabel: string;
  sourceUrl: string;
  addedDate: string;
}

// A logged-in user, as returned by the backend's /api/auth/* routes.
// `prefs` is a small free-form bag for per-user flags that don't need their
// own database table — hidden demo cards, saved demo slugs (see
// lib/authPrefs.ts for the typed keys actually used).
export interface UserPublic {
  id: number;
  email: string;
  name: string;
  plan: string;
  // Mirrors Stripe's own subscription status verbatim ("active", "trialing",
  // "past_due", "unpaid", ...) — null on the Free plan or once a
  // subscription is fully canceled. See the backend's UserPublic schema.
  subscriptionStatus: string | null;
  // 'monthly' | 'annual' — which billing interval the current subscription
  // is on. Null on the Free plan or once fully canceled, same as
  // subscriptionStatus above.
  subscriptionInterval: string | null;
  prefs: Record<string, unknown>;
}

export interface AuthResult {
  token: string;
  user: UserPublic;
}
