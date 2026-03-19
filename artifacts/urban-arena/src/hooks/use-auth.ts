import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

const TOKEN_KEY = "urban_arena_admin_token";

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

  // Provide a memoized headers object for API requests
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  return { token, setToken: saveToken, authHeaders };
}

// Wrapper for protecting admin routes
export function useRequireAuth() {
  const { token, authHeaders, setToken } = useAuthToken();
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

  return { isAuthenticated: !!token, authHeaders, logout };
}
