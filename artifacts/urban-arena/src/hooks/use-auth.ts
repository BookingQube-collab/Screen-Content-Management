import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

const TOKEN_KEY = "urban_arena_admin_token";

/** Decode JWT payload without verification (client-side only). */
function decodeJwtPayload(token: string): { id: number; email: string; role: string } | null {
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

  // Decode role from JWT payload (no server round-trip needed)
  const role: string = token ? (decodeJwtPayload(token)?.role ?? "user") : "user";
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
