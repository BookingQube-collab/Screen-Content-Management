import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

const TOKEN_KEY = "urban_arena_admin_token";

/**
 * Decode JWT payload without verification (client-side only).
 * Returns null on any parse failure.
 */
function decodeJwtPayload(token: string): { id: number; email: string; role?: string } | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function useAuthToken() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const saveToken = useCallback((newToken: string | null) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setToken(newToken);
  }, []);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Decode role from JWT payload.
  // Old tokens (issued before role was added) have no role field — default to
  // super_admin so existing admins keep full access until they re-login.
  const decoded = token ? decodeJwtPayload(token) : null;
  const role: string = decoded?.role ?? "super_admin";
  const isSuperAdmin = role === "super_admin";

  return { token, setToken: saveToken, authHeaders, role, isSuperAdmin };
}

// Wrapper for protecting admin routes
export function useRequireAuth() {
  const { token, authHeaders, setToken, role, isSuperAdmin } = useAuthToken();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) {
      setLocation("/admin/login");
    }
  }, [token, setLocation]);

  const logout = useCallback(() => {
    setToken(null);
    setLocation("/admin/login");
  }, [setToken, setLocation]);

  return { isAuthenticated: !!token, authHeaders, logout, role, isSuperAdmin };
}
