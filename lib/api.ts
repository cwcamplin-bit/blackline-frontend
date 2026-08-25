import type { AnalysisResult, AuthResult, UserPublic } from './types';

// Deployed permanently on Render (see the backend repo's README). Override
// by setting NEXT_PUBLIC_BLACKLINE_API_BASE at build time if you ever need
// to point at a local dev server instead.
export const API_BASE =
  process.env.NEXT_PUBLIC_BLACKLINE_API_BASE || 'https://blackline-backend-tjok.onrender.com';

/**
 * Render's free tier sleeps after 15 minutes idle — the first request after
 * a quiet spell can take 30-60s to wake the container before it even starts
 * analysing. 90s gives that real headroom before giving up, so a cold start
 * reads as "slow" rather than "the button is broken".
 */
export async function analyseProperty(url: string): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'The server took too long to respond (over 90s). It may still be waking up from idle — try again in a moment.'
      );
    }
    throw new Error('Could not reach the Blackline server. Check your connection and try again.');
  } finally {
    clearTimeout(timeoutId);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body && body.detail ? body.detail : `Request failed (HTTP ${res.status}).`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return body as AnalysisResult;
}

/* ---------- Auth token storage ----------
 * A bearer token in localStorage, not an httpOnly cookie — the frontend and
 * backend are on different origins (this app vs. the Render API), and
 * cross-site cookies bring SameSite/Secure headaches that are hard to get
 * right without a live browser to test against. See the backend's
 * app/security.py for the fuller rationale. Every authenticated call below
 * reads the token fresh from storage rather than caching it in a module
 * variable, so multiple tabs stay consistent with whatever's actually
 * stored. */
const TOKEN_KEY = 'blackline_auth_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore — private browsing / storage blocked */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------- Generic authenticated JSON request helper ---------- */

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; query?: Record<string, string> } = {}
): Promise<T> {
  const { method = 'GET', body, auth = true, query } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let url = `${API_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Could not reach the Blackline server. Check your connection and try again.');
  }

  const parsed = await res.json().catch(() => null);
  if (!res.ok) {
    const code = (parsed && parsed.error) || 'request_failed';
    const detail = (parsed && parsed.detail) || `Request failed (HTTP ${res.status}).`;
    throw new ApiError(res.status, code, typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return parsed as T;
}

/* ---------- Accounts ---------- */

export async function signup(name: string, email: string, password: string): Promise<AuthResult> {
  return apiRequest<AuthResult>('/api/auth/signup', { method: 'POST', body: { name, email, password }, auth: false });
}

export async function login(email: string, password: string): Promise<AuthResult> {
  return apiRequest<AuthResult>('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

export async function logout(): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }).catch(() => {
    /* stateless token — a failed logout call has nothing to roll back client-side */
  });
}

export async function getMe(): Promise<UserPublic> {
  return apiRequest<UserPublic>('/api/auth/me');
}

export async function updateProfile(name: string): Promise<UserPublic> {
  return apiRequest<UserPublic>('/api/auth/me', { method: 'PATCH', body: { name } });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/auth/password', { method: 'POST', body: { currentPassword, newPassword } });
}

export async function updatePrefs(prefs: Record<string, unknown>): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/auth/prefs', { method: 'PATCH', body: { prefs } });
}

/* ---------- Saved properties ---------- */

export interface SavedPropertyRow {
  sourceUrl: string;
  data: AnalysisResult;
  savedAt: string;
}

export async function listSaved(): Promise<SavedPropertyRow[]> {
  return apiRequest<SavedPropertyRow[]>('/api/saved');
}

export async function saveProperty(sourceUrl: string, data: AnalysisResult): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/saved', { method: 'POST', body: { sourceUrl, data } });
}

export async function deleteSaved(sourceUrl: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/saved', { method: 'DELETE', query: { sourceUrl } });
}

/* ---------- History log ---------- */

export async function listHistory(): Promise<import('./types').HistoryEntry[]> {
  return apiRequest<import('./types').HistoryEntry[]>('/api/history');
}

export async function recordHistory(sourceUrl: string, data: AnalysisResult): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/history', { method: 'POST', body: { sourceUrl, data } });
}

export async function deleteHistory(sourceUrl: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/history', { method: 'DELETE', query: { sourceUrl } });
}

/* ---------- Watchlists ---------- */

export async function listWatchlists(): Promise<Record<string, import('./types').WatchlistMatch[]>> {
  return apiRequest<Record<string, import('./types').WatchlistMatch[]>>('/api/watchlists');
}

export async function addWatchlistMatch(watchlistName: string, data: AnalysisResult): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/watchlists/matches', {
    method: 'POST',
    body: { watchlistName, data },
  });
}

/* ---------- Billing (Stripe subscriptions) ----------
 * Both calls return a Stripe-hosted URL to redirect the browser to — this
 * app never touches card details itself. `window.location.origin` is used
 * for the success/cancel/return URLs rather than a hardcoded frontend
 * origin, since this app isn't deployed anywhere fixed yet (local dev
 * today, likely elsewhere later); the backend cross-checks these against
 * its own ALLOWED_ORIGINS before handing them to Stripe. */

export type PlanId = 'pro' | 'professional';

export async function createCheckoutSession(plan: PlanId, redirectTo: string): Promise<string> {
  const origin = window.location.origin;
  const { url } = await apiRequest<{ url: string }>('/api/billing/checkout', {
    method: 'POST',
    body: {
      plan,
      successUrl: `${origin}${redirectTo}?upgraded=1`,
      cancelUrl: `${origin}${redirectTo}`,
    },
  });
  return url;
}

export async function createBillingPortalSession(redirectTo: string): Promise<string> {
  const origin = window.location.origin;
  const { url } = await apiRequest<{ url: string }>('/api/billing/portal', {
    method: 'POST',
    body: { returnUrl: `${origin}${redirectTo}` },
  });
  return url;
}
