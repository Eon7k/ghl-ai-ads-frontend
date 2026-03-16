/**
 * API client for the backend. All requests go through the same-origin proxy
 * so the app works in the GHL iframe without CORS issues.
 * Sends the auth token when present so experiment routes are user-scoped.
 */

import { getToken } from "./auth";

const API_BASE = "/api/proxy";

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; skipAuth?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, skipAuth } = options;
  const url = `${API_BASE}/${path.replace(/^\//, "")}`;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!skipAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    mode: "cors",
    credentials: "omit",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.error === "string" ? data.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export type AuthUser = { id: string; email: string };
export type LoginResponse = { token: string; user: AuthUser };
export type MeResponse = { user: AuthUser };

export const api = {
  /** Register; returns token and user. Use skipAuth so we don't require a token. */
  auth: {
    register: (email: string, password: string) =>
      request<LoginResponse>("auth/register", { method: "POST", body: { email, password }, skipAuth: true }),
    login: (email: string, password: string) =>
      request<LoginResponse>("auth/login", { method: "POST", body: { email, password }, skipAuth: true }),
    me: () => request<MeResponse>("auth/me"),
  },

  /** List all experiments (requires auth) */
  listExperiments: () => request<import("./types").Experiment[]>("experiments"),

  /** Create experiment with prompt and variant count; returns experiment with variants */
  createExperiment: (body: import("./types").CreateExperimentBody) =>
    request<import("./types").Experiment>("experiments", { method: "POST", body }),

  /** Get one experiment with its variants */
  getExperiment: (id: string) =>
    request<import("./types").Experiment>(`experiments/${id}`),

  /** Update a variant's ad copy */
  updateVariant: (experimentId: string, variantId: string, copy: string) =>
    request<import("./types").AdVariant>(
      `experiments/${experimentId}/variants/${variantId}`,
      { method: "PATCH", body: { copy } }
    ),

  /** Regenerate one variant's copy with AI (returns new copy; backend also updates stored variant) */
  regenerateVariant: (experimentId: string, variantId: string) =>
    request<{ copy: string }>(
      `experiments/${experimentId}/variants/${variantId}/regenerate`,
      { method: "POST", body: {} }
    ),

  /** Mark experiment as launched; optional aiCreativeCount = how many variants get AI creatives at launch */
  launchExperiment: (id: string, options?: { aiCreativeCount?: number }) =>
    request<import("./types").Experiment>(`experiments/${id}/launch`, {
      method: "POST",
      body: options?.aiCreativeCount != null ? { aiCreativeCount: options.aiCreativeCount } : {},
    }),

  /** List connected ad accounts (Meta, TikTok, Google) */
  integrations: {
    list: () =>
      request<{ integrations: ConnectedIntegration[] }>("integrations").then((r) => r.integrations),
    disconnect: (id: string) =>
      request<{ ok: boolean }>(`integrations/${id}`, { method: "DELETE" }),
    /** Meta ad accounts (requires Meta connected) */
    getMetaAdAccounts: () =>
      request<{ adAccounts: MetaAdAccount[] }>("integrations/meta/ad-accounts").then((r) => r.adAccounts),
  },
};

export type MetaAdAccount = {
  id: string;
  name: string;
  accountId: string;
  accountStatus?: number;
};

export type ConnectedIntegration = {
  id: string;
  platform: "meta" | "tiktok" | "google";
  platformAccountId?: string;
  platformAccountName?: string;
  createdAt: string;
};
