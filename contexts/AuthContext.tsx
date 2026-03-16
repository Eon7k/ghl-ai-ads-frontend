"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type AuthUser } from "@/lib/api";
import { getToken, setToken, clearToken } from "@/lib/auth";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user: u } = await api.auth.me();
      setUser(u);
    } catch {
      clearToken();
      setUser(null);
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
      router.push("/experiments");
    },
    [router]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const { token, user: u } = await api.auth.register(email, password);
      setToken(token);
      setUser(u);
      router.push("/experiments");
    },
    [router]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
