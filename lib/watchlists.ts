// The three named watchlists are still fixed/seeded, not user-creatable —
// the "+ New watchlist" and "Edit" buttons on the Saved page remain stubs
// (see that page's handleWatchlistStub), matching the original prototype.
// Real matches for each name now come from the backend (GET /api/watchlists,
// grouped by this same name) rather than localStorage.
export const WATCHLIST_NAMES = [
  'Manchester Cash-Flow BTL',
  'Leeds Regeneration Corridor',
  'Sub-£150k BRRR Candidates',
] as const;
