'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'blackline_theme';
const SYNC_EVENT = 'blackline-theme-sync';

export function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  try {
    document.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { theme } }));
  } catch {
    /* ignore */
  }
}

/**
 * Reads the stored theme and applies it to <html>. Used both by the
 * blocking <head> script (see ThemeInit) on first parse, and again
 * whenever a page might be showing a stale theme: another tab changed it
 * (storage event), the browser restored this page from bfcache instead of
 * re-running scripts (pageshow with persisted:true), or the tab just
 * regained focus/visibility.
 */
export function resyncThemeFromStorage(): Theme {
  let applied: Theme = 'dark';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
      applied = stored;
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  } catch {
    /* ignore */
  }
  return applied;
}

/**
 * Hook for any component that needs to read/toggle the current theme (the
 * Account page's switch). Stays in sync with cross-tab changes and the
 * bfcache/focus resync handled globally by <ThemeSync/>.
 */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(currentTheme());
    function onSync(e: Event) {
      const detail = (e as CustomEvent<{ theme?: Theme }>).detail;
      setTheme(detail?.theme ?? currentTheme());
    }
    document.addEventListener(SYNC_EVENT, onSync);
    return () => document.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const toggle = useCallback(() => {
    applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
  }, []);

  return [theme, toggle];
}
