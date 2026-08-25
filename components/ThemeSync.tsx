'use client';

import { useEffect } from 'react';
import { resyncThemeFromStorage } from '@/lib/theme';

/**
 * Mounted once in the root layout. Re-applies the stored theme (and
 * dispatches the blackline-theme-sync event so any mounted useTheme()
 * consumers, e.g. Account's switch, stay correct) on the same four
 * triggers the original per-page scripts used:
 *  - the native `storage` event (another tab changed the theme)
 *  - `pageshow` with persisted:true (restored from bfcache)
 *  - `focus` / `visibilitychange` (robustness fallback)
 * A real Next.js client-side navigation doesn't remount <html>, so unlike
 * the old multi-page site this only needs to run once for the whole app,
 * not be duplicated per page.
 */
export default function ThemeSync() {
  useEffect(() => {
    function resync() {
      resyncThemeFromStorage();
    }
    function onStorage(e: StorageEvent) {
      if (!e.key || e.key === 'blackline_theme') resync();
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) resync();
    }
    function onVisibility() {
      if (!document.hidden) resync();
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', resync);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', resync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
