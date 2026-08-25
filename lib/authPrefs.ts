import type { UserPublic } from './types';

// Small per-user flags that don't need their own database table — stored
// server-side as a single JSONB column (see the backend's `users.prefs`).
// These are the direct replacements for what used to be separate
// localStorage keys: `blackline_saved` (demo slug bookmarks),
// `blackline_saved_hidden_demo`, `blackline_history_hidden_demo`.
export interface AuthPrefs {
  savedDemoSlugs: string[];
  hiddenDemoSaved: string[];
  hiddenDemoHistory: string[];
  // An index signature, not just the three known keys above — this is a
  // genuinely open bag server-side (`users.prefs` is a JSONB column, see
  // the backend's UpdatePrefsRequest), and updatePrefs() in lib/api.ts
  // takes a plain Record<string, unknown>. Without this, passing an
  // AuthPrefs value there fails to type-check (an interface with only
  // named properties isn't assignable to Record<string, unknown> even
  // when every property is compatible) — a real error this sandbox's
  // syntax-only checks couldn't catch, only surfaced by a real `next
  // build`'s type-check.
  [key: string]: unknown;
}

const EMPTY_PREFS: AuthPrefs = { savedDemoSlugs: [], hiddenDemoSaved: [], hiddenDemoHistory: [] };

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function readPrefs(user: UserPublic | null | undefined): AuthPrefs {
  if (!user) return { ...EMPTY_PREFS };
  const p = (user.prefs || {}) as Record<string, unknown>;
  return {
    savedDemoSlugs: asStringArray(p.savedDemoSlugs),
    hiddenDemoSaved: asStringArray(p.hiddenDemoSaved),
    hiddenDemoHistory: asStringArray(p.hiddenDemoHistory),
  };
}

function withUnique(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value];
}
function without(list: string[], value: string): string[] {
  return list.filter((v) => v !== value);
}

export function addSavedDemoSlug(prefs: AuthPrefs, slug: string): AuthPrefs {
  return { ...prefs, savedDemoSlugs: withUnique(prefs.savedDemoSlugs, slug) };
}
export function removeSavedDemoSlug(prefs: AuthPrefs, slug: string): AuthPrefs {
  return { ...prefs, savedDemoSlugs: without(prefs.savedDemoSlugs, slug) };
}
export function hideDemoSaved(prefs: AuthPrefs, slug: string): AuthPrefs {
  return { ...prefs, hiddenDemoSaved: withUnique(prefs.hiddenDemoSaved, slug) };
}
export function hideDemoHistory(prefs: AuthPrefs, slug: string): AuthPrefs {
  return { ...prefs, hiddenDemoHistory: withUnique(prefs.hiddenDemoHistory, slug) };
}
