"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type AuthUser } from "@/lib/api";
import { getToken, setToken, clearToken } from "@/lib/auth";
import { setViewingAs } from "@/lib/viewingAs";

export type AccountType = "single" | "agency";
export type ClientOption = { id: string; email: string };

type AuthState = {
  user: AuthUser | null;
  isAdmin: boolean;
  accountType: AccountType;
  clients: ClientOption[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("single");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsAdmin(false);
      setAccountType("single");
      setClients([]);
      setViewingAs(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me.user);
      setIsAdmin(!!me.isAdmin);
      setAccountType((me.accountType as AccountType) ?? "single");
      setClients(me.clients ?? []);
      if ((me.accountType as AccountType) !== "agency") setViewingAs(null);
    } catch {
      clearToken();
      setUser(null);
      setIsAdmin(false);
      setAccountType("single");
      setClients([]);
      setViewingAs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user: u } = await api.auth.login(email, password);
      setToken(token);
      setUser(u);
      const me = await api.auth.me();
      setIsAdmin(!!me.isAdmin);
      setAccountType((me.accountType as AccountType) ?? "single");
      setClients(me.clients ?? []);
      if ((me.accountType as AccountType) !== "agency") setViewingAs(null);
      router.push("/");
    },
    [router]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const { token, user: u } = await api.auth.register(email, password);
      setToken(token);
      setUser(u);
      const me = await api.auth.me();
      setIsAdmin(!!me.isAdmin);
      setAccountType((me.accountType as AccountType) ?? "single");
      setClients(me.clients ?? []);
      if ((me.accountType as AccountType) !== "agency") setViewingAs(null);
      router.push("/");
    },
    [router]
  );

  const logout = useCallback(() => {
    clearToken();
    setViewingAs(null);
    setUser(null);
    setAccountType("single");
    setClients([]);
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isAdmin, accountType, clients, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
