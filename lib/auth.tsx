'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UserPublic } from './types';
import * as api from './api';

interface AuthContextValue {
  user: UserPublic | null;
  /** True until the initial /api/auth/me check (using any stored token) resolves. */
  loading: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Replaces the whole prefs bag server-side (small per-user flags — see
   * lib/authPrefs.ts) and updates the local user optimistically so callers
   * don't need a round-trip to see their own write reflected. */
  updatePrefs: (prefs: Record<string, unknown>) => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      // Token missing/expired/invalid, or the backend has no database
      // configured yet (503) — either way, treat as logged out rather than
      // looping on a call that can't succeed.
      api.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const result = await api.signup(name, email, password);
    api.setToken(result.token);
    setUser(result.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    api.setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    api.clearToken();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    const u = await api.updateProfile(name);
    setUser(u);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.changePassword(currentPassword, newPassword);
  }, []);

  const updatePrefs = useCallback(async (prefs: Record<string, unknown>) => {
    await api.updatePrefs(prefs);
    setUser((prev) => (prev ? { ...prev, prefs } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signup, login, logout, updateProfile, changePassword, updatePrefs, refreshMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used within <AuthProvider>.');
  return ctx;
}
