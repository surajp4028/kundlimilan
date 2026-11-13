"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { api } from "./api";

import type { PublicSettings } from "@/lib/server/settings";
export type { PublicSettings };
export type Me = {
  uid: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  memberSince: string;
  avatar?: string | null;
};

const SiteCtx = createContext<PublicSettings | null>(null);
export const useSite = () => useContext(SiteCtx)!;

type AuthState = { user: Me | null; ready: boolean; setUser: (u: Me | null) => void; refresh: () => Promise<void>; logout: () => Promise<void> };
const AuthCtx = createContext<AuthState | null>(null);
export const useAuth = () => useContext(AuthCtx)!;

/**
 * Keeps the customer signed in across visits.
 * - The real credential is an HttpOnly cookie (JS can't read it → XSS-safe), backed by a DB session.
 * - localStorage keeps only a non-secret profile snapshot so the UI shows "logged in" instantly,
 *   then it is re-validated against /api/auth/me.
 */
const LS_KEY = "km.profile.v1";

export function Providers({ settings, initialUser, children }: { settings: PublicSettings; initialUser: Me | null; children: ReactNode }) {
  const [user, setUserState] = useState<Me | null>(initialUser);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("js");
  }, []);

  const setUser = useCallback((u: Me | null) => {
    setUserState(u);
    try {
      if (u) localStorage.setItem(LS_KEY, JSON.stringify({ ...u, cachedAt: Date.now() }));
      else localStorage.removeItem(LS_KEY);
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: Me | null }>("/api/auth/me");
      setUser(r.user);
    } catch {
      /* offline: keep cached profile */
    } finally {
      setReady(true);
    }
  }, [setUser]);

  // The server validated the HttpOnly session cookie for this render: mirror the result
  // into localStorage (snapshot for instant UI / future offline + app hand-off).
  useEffect(() => {
    try {
      if (initialUser) localStorage.setItem(LS_KEY, JSON.stringify({ ...initialUser, cachedAt: Date.now() }));
      else localStorage.removeItem(LS_KEY);
    } catch {}
  }, [initialUser]);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, [setUser]);

  const auth = useMemo(() => ({ user, ready, setUser, refresh, logout }), [user, ready, setUser, refresh, logout]);

  return (
    <SiteCtx.Provider value={settings}>
      <AuthCtx.Provider value={auth}>
        {children}
        <Toaster position="top-center" richColors closeButton theme="light" toastOptions={{ style: { borderRadius: 16, fontFamily: "var(--font-sans)", border: "1px solid rgb(200 146 46 / .25)" } }} />
      </AuthCtx.Provider>
    </SiteCtx.Provider>
  );
}
