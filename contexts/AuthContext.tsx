"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, type AuthUser, type MeResponse } from "@/lib/api";
import { getToken, setToken, clearToken } from "@/lib/auth";
import { setViewingAs } from "@/lib/viewingAs";

export type AccountType = "single" | "agency";
export type ClientOption = { id: string; email: string };

type AuthState = {
  user: AuthUser | null;
  isAdmin: boolean;
  accountType: AccountType;
  clients: ClientOption[];
  /** From /auth/me; null means all expansion modules allowed (legacy). */
  enabledProductKeys: string[] | null;
  businessOnboardingComplete: boolean | null;
  businessModelProfile: Record<string, unknown> | null;
  /** Email of the user whose business profile is in scope (you vs. a client). */
  businessProfileForEmail: string | null;
  needsBusinessOnboarding: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function setStateFromMe(
  me: MeResponse,
  st: {
    setIsAdmin: (v: boolean) => void;
    setAccountType: (v: AccountType) => void;
    setClients: (v: ClientOption[]) => void;
    setEnabledProductKeys: (v: string[] | null) => void;
    setBusinessOnboardingComplete: (v: boolean | null) => void;
    setBusinessModelProfile: (v: Record<string, unknown> | null) => void;
    setBusinessProfileForEmail: (v: string | null) => void;
  }
): void {
  st.setIsAdmin(!!me.isAdmin);
  st.setAccountType((me.accountType as AccountType) ?? "single");
  st.setClients(me.clients ?? []);
  st.setEnabledProductKeys(me.enabledProductKeys ?? null);
  st.setBusinessOnboardingComplete(me.businessOnboardingComplete ?? null);
  st.setBusinessModelProfile(
    (me.businessModelProfile as Record<string, unknown> | null | undefined) ?? null
  );
  st.setBusinessProfileForEmail(
    (typeof me.businessProfileForEmail === "string" && me.businessProfileForEmail) || me.user.email || null
  );
  if ((me.accountType as AccountType) !== "agency") setViewingAs(null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("single");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [enabledProductKeys, setEnabledProductKeys] = useState<string[] | null>(null);
  const [businessOnboardingComplete, setBusinessOnboardingComplete] = useState<boolean | null>(null);
  const [businessModelProfile, setBusinessModelProfile] = useState<Record<string, unknown> | null>(null);
  const [businessProfileForEmail, setBusinessProfileForEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const st = useMemo(
    () => ({
      setIsAdmin,
      setAccountType,
      setClients,
      setEnabledProductKeys,
      setBusinessOnboardingComplete,
      setBusinessModelProfile,
      setBusinessProfileForEmail,
    }),
    []
  );

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsAdmin(false);
      setAccountType("single");
      setClients([]);
      setEnabledProductKeys(null);
      setBusinessOnboardingComplete(null);
      setBusinessModelProfile(null);
      setBusinessProfileForEmail(null);
      setViewingAs(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me.user);
      setStateFromMe(me, st);
    } catch {
      clearToken();
      setUser(null);
      setIsAdmin(false);
      setAccountType("single");
      setClients([]);
      setEnabledProductKeys(null);
      setBusinessOnboardingComplete(null);
      setBusinessModelProfile(null);
      setBusinessProfileForEmail(null);
      setViewingAs(null);
    } finally {
      setLoading(false);
    }
  }, [st]);

  const refreshUser = useCallback(async () => {
    const me = await api.auth.me();
    setUser(me.user);
    setStateFromMe(me, st);
  }, [st]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user: u } = await api.auth.login(email, password);
      setToken(token);
      setUser(u);
      const me = await api.auth.me();
      setStateFromMe(me, st);
      if (me.businessOnboardingComplete === false) {
        router.push("/onboarding/business");
      } else {
        router.push("/");
      }
    },
    [router, st]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const { token, user: u } = await api.auth.register(email, password);
      setToken(token);
      setUser(u);
      const me = await api.auth.me();
      setStateFromMe(me, st);
      router.push("/onboarding/business");
    },
    [router, st]
  );

  const logout = useCallback(() => {
    clearToken();
    setViewingAs(null);
    setUser(null);
    setAccountType("single");
    setClients([]);
    setEnabledProductKeys(null);
    setBusinessOnboardingComplete(null);
    setBusinessModelProfile(null);
    setBusinessProfileForEmail(null);
    router.push("/");
  }, [router]);

  const needsBusinessOnboarding = businessOnboardingComplete === false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        accountType,
        clients,
        enabledProductKeys,
        businessOnboardingComplete,
        businessModelProfile,
        businessProfileForEmail,
        needsBusinessOnboarding,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
