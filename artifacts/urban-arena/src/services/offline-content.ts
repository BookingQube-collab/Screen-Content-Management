/**
 * OfflineContentService — abstraction layer for offline content storage.
 *
 * Current implementation uses localStorage for metadata caching.
 * Future: swap out the adapter for Capacitor Filesystem / IndexedDB
 * without changing any calling code.
 */

const CACHE_KEY = "ua_offline_activities";
const CACHE_META_KEY = "ua_offline_meta";

export interface CachedActivity {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  ageLimit: number;
  termsAndConditions?: string | null;
  heroImageUrl?: string | null;
  heroVideoUrl?: string | null;
  cardImageUrl?: string | null;
  thumbnailUrl?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  ctaText: string;
  locationId?: number | null;
  screenId?: number | null;
  moduleType?: string | null;
  isOfflineEnabled?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface OfflineMeta {
  lastSync: string | null;
  totalCached: number;
}

// ── Storage adapter (swap this for Capacitor later) ──────────────────────────

const StorageAdapter = {
  get: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { /* quota exceeded */ }
  },
  remove: (key: string): void => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

export const OfflineContentService = {
  /**
   * Cache a list of activities locally for offline use.
   * Only caches activities where isOfflineEnabled === true,
   * but you can pass `forceAll: true` to cache everything.
   */
  cacheActivities(activities: CachedActivity[], forceAll = false): void {
    const toCache = forceAll
      ? activities
      : activities.filter(a => a.isOfflineEnabled);

    StorageAdapter.set(CACHE_KEY, JSON.stringify(toCache));
    StorageAdapter.set(CACHE_META_KEY, JSON.stringify({
      lastSync: new Date().toISOString(),
      totalCached: toCache.length,
    }));
  },

  /** Return cached activities, filtered by screen/location if given. */
  getOfflineActivities(opts?: { screenId?: number; locationId?: number }): CachedActivity[] {
    const raw = StorageAdapter.get(CACHE_KEY);
    if (!raw) return [];
    try {
      let list: CachedActivity[] = JSON.parse(raw);
      if (opts?.screenId   != null) list = list.filter(a => !a.screenId   || a.screenId   === opts.screenId);
      if (opts?.locationId != null) list = list.filter(a => !a.locationId || a.locationId === opts.locationId);
      return list.sort((a, b) => a.sortOrder - b.sortOrder);
    } catch { return []; }
  },

  /** Metadata about the last sync. */
  getMeta(): OfflineMeta {
    const raw = StorageAdapter.get(CACHE_META_KEY);
    if (!raw) return { lastSync: null, totalCached: 0 };
    try { return JSON.parse(raw); } catch { return { lastSync: null, totalCached: 0 }; }
  },

  /** Clear all cached content. */
  clearCache(): void {
    StorageAdapter.remove(CACHE_KEY);
    StorageAdapter.remove(CACHE_META_KEY);
  },

  /** True if there is any cached data available. */
  hasCache(): boolean {
    return StorageAdapter.get(CACHE_KEY) !== null;
  },
};
