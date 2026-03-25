import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

const TOKEN_KEY = "urban_arena_admin_token";

export interface MeData {
  id: number;
  email: string;
  name: string | null;
  role: string;
  /** Location IDs this user can access. Empty array = no access. null = all (super admin). */
  assignedLocationIds: number[];
}

/** Decode JWT payload without verification (client-side only). */
function decodeJwtPayload(token: string): { id: number; email: string; role?: string } | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * Module-level cache so /auth/me is only fetched once per token,
 * regardless of how many components call useRequireAuth.
 */
const meCache: { token: string | null; data: MeData | null; promise: Promise<MeData | null> | null } = {
  token: null, data: null, promise: null,
};

function fetchMe(token: string): Promise<MeData | null> {
  if (meCache.token === token && meCache.data) return Promise.resolve(meCache.data);
  if (meCache.token === token && meCache.promise) return meCache.promise;
  meCache.token = token;
  meCache.data = null;
  meCache.promise = fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
    .then(r => (r.ok ? r.json() : null))
    .then((d: MeData | null) => { meCache.data = d; return d; })
    .catch(() => null);
  return meCache.promise;
}

function clearMeCache() {
  meCache.token = null;
  meCache.data = null;
  meCache.promise = null;
}

export function useAuthToken() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const saveToken = useCallback((newToken: string | null) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      clearMeCache();
    }
    setToken(newToken);
  }, []);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Decode role from JWT for an immediate (non-async) answer.
  // Old tokens without a role field default to super_admin (backward compat).
  const decoded = token ? decodeJwtPayload(token) : null;
  const jwtRole: string = decoded?.role ?? "super_admin";

  return { token, setToken: saveToken, authHeaders, jwtRole };
}

/** Protect admin routes and expose the current user's access info. */
export function useRequireAuth() {
  const { token, authHeaders, setToken, jwtRole } = useAuthToken();
  const [, setWouterLocation] = useLocation();
  const [meData, setMeData] = useState<MeData | null>(
    meCache.token === token ? meCache.data : null,
  );

  useEffect(() => {
    if (!token) {
      setWouterLocation("/admin/login");
      return;
    }
    if (meCache.token === token && meCache.data) {
      setMeData(meCache.data);
      return;
    }
    fetchMe(token).then(d => { if (d) setMeData(d); });
  }, [token, setWouterLocation]);

  const logout = useCallback(() => {
    clearMeCache();
    setToken(null);
    setWouterLocation("/admin/login");
  }, [setToken, setWouterLocation]);

  // Prefer server-fetched role; fall back to JWT-decoded while fetch is in flight.
  const role: string = meData?.role ?? jwtRole;
  const isSuperAdmin = role === "super_admin";

  /**
   * null  → super admin, sees everything
   * []    → user with no permissions yet
   * [1,2] → user restricted to location IDs 1 and 2
   */
  const assignedLocationIds: number[] | null = isSuperAdmin
    ? null
    : (meData?.assignedLocationIds ?? null);

  return { isAuthenticated: !!token, authHeaders, logout, role, isSuperAdmin, assignedLocationIds, meData };
}
