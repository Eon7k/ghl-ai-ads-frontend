/**
 * API client for the backend. All requests go through the same-origin proxy
 * so the app works in the GHL iframe without CORS issues.
 * Sends the auth token when present so experiment routes are user-scoped.
 */

import { getToken } from "./auth";
import { getViewingAs } from "./viewingAs";

const API_BASE = "/api/proxy";

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  const viewingAs = getViewingAs();
  if (viewingAs) h["X-Viewing-As"] = viewingAs;
  return h;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; skipAuth?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, skipAuth } = options;
  const url = `${API_BASE}/${path.replace(/^\//, "")}`;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!skipAuth) Object.assign(headers, authHeaders());
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
export type MeResponse = {
  user: AuthUser;
  isAdmin?: boolean;
  accountType?: "single" | "agency";
  clients?: { id: string; email: string }[];
};

export type AdminOverview = {
  totalUsers: number;
  totalCampaigns: number;
  launchedCampaigns: number;
  byPlatform: Record<string, number>;
  byStatus: Record<string, number>;
  funnel: { created: number; launched: number };
};

export type AdminAiPerformance = {
  byProvider: Record<
    string,
    {
      campaigns: number;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      avgCtr: number;
      avgCpc: number;
    }
  >;
};

export const api = {
  /** Register; returns token and user. Use skipAuth so we don't require a token. */
  auth: {
    register: (email: string, password: string) =>
      request<LoginResponse>("auth/register", { method: "POST", body: { email, password }, skipAuth: true }),
    login: (email: string, password: string) =>
      request<LoginResponse>("auth/login", { method: "POST", body: { email, password }, skipAuth: true }),
    me: () => request<MeResponse>("auth/me"),
  },

  /** Admin-only: overview, AI performance, users, and agency clients. */
  admin: {
    overview: () => request<AdminOverview>("admin/overview"),
    aiPerformance: () => request<AdminAiPerformance>("admin/ai-performance"),
    listUsers: () =>
      request<{ users: { id: string; email: string; accountType: string; createdAt: string }[] }>("admin/users").then(
        (r) => r.users
      ),
    updateUserAccountType: (userId: string, accountType: "single" | "agency") =>
      request<{ ok: boolean; accountType: string }>(`admin/users/${userId}`, {
        method: "PATCH",
        body: { accountType },
      }),
    listAgencyClients: (agencyUserId: string) =>
      request<{ clients: { id: string; email: string }[] }>(`admin/agencies/${agencyUserId}/clients`).then(
        (r) => r.clients
      ),
    addAgencyClient: (agencyUserId: string, emailOrId: string) =>
      request<{ client: { id: string; email: string } }>(`admin/agencies/${agencyUserId}/clients`, {
        method: "POST",
        body: emailOrId.includes("@") ? { email: emailOrId } : { clientUserId: emailOrId },
      }),
    removeAgencyClient: (agencyUserId: string, clientUserId: string) =>
      request<{ ok: boolean }>(`admin/agencies/${agencyUserId}/clients/${clientUserId}`, {
        method: "DELETE",
      }),
  },

  /** Agency self-serve clients (agency account only) */
  agency: {
    listClients: () =>
      request<{ clients: { id: string; email: string; loginDisabled: boolean; createdAt: string }[] }>("agency/clients").then(
        (r) => r.clients
      ),
    addClient: (email: string, allowLogin: boolean) =>
      request<{ client: { id: string; email: string; loginDisabled: boolean }; tempPassword?: string }>("agency/clients", {
        method: "POST",
        body: { email, allowLogin },
      }),
    removeClient: (clientUserId: string) =>
      request<{ ok: boolean }>(`agency/clients/${clientUserId}`, { method: "DELETE" }),
  },

  /** List all experiments (requires auth) */
  listExperiments: () => request<import("./types").Experiment[]>("experiments"),

  /** Create experiment with prompt and variant count; returns experiment with variants */
  createExperiment: (body: import("./types").CreateExperimentBody) =>
    request<import("./types").Experiment>("experiments", { method: "POST", body }),

  /** Get one experiment with its variants */
  getExperiment: (id: string) =>
    request<import("./types").Experiment>(`experiments/${id}`),

  /** Update experiment (e.g. creative direction for image generation). */
  updateExperiment: (id: string, data: { creativePrompt?: string | null }) =>
    request<import("./types").Experiment>(`experiments/${id}`, { method: "PATCH", body: data }),

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

  /** Generate AI creative (image) for a variant. Returns { hasCreative: true } on success. */
  generateVariantCreative: (experimentId: string, variantId: string) =>
    request<{ hasCreative: boolean }>(
      `experiments/${experimentId}/variants/${variantId}/generate-creative`,
      { method: "POST", body: {} }
    ),

  /** Get blob URL for variant creative image (for use in <img src>. Caller should revoke the URL when done.) */
  getVariantCreativeBlobUrl: async (experimentId: string, variantId: string): Promise<string> => {
    const url = `${API_BASE}/experiments/${experimentId}/variants/${variantId}/creative`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to load creative");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  /** Reorder variants. Pass variant ids in the desired order. */
  reorderVariants: (experimentId: string, variantIds: string[]) =>
    request<{ variants: import("./types").AdVariant[] }>(`experiments/${experimentId}/variants/reorder`, {
      method: "PATCH",
      body: { variantIds },
    }),

  /** Swap creatives (images) between two variants. */
  swapVariantCreatives: (experimentId: string, variantIdA: string, variantIdB: string) =>
    request<{ variants: import("./types").AdVariant[] }>(`experiments/${experimentId}/variants/swap-creatives`, {
      method: "POST",
      body: { variantIdA, variantIdB },
    }),

  /** Mark experiment as launched. For Meta: pass metaAdAccountId (act_xxx) and optional landingPageUrl. Use dryRun: true to create on Meta but leave paused (no spend). */
  launchExperiment: (
    id: string,
    options?: { aiCreativeCount?: number; metaAdAccountId?: string; landingPageUrl?: string; dryRun?: boolean }
  ) =>
    request<import("./types").Experiment & { dryRun?: boolean }>(`experiments/${id}/launch`, {
      method: "POST",
      body: {
        ...(options?.aiCreativeCount != null && { aiCreativeCount: options.aiCreativeCount }),
        ...(options?.metaAdAccountId && { metaAdAccountId: options.metaAdAccountId }),
        ...(options?.landingPageUrl && { landingPageUrl: options.landingPageUrl }),
        ...(options?.dryRun === true && { dryRun: true }),
      },
    }),

  /** Get campaign metrics (full Meta-style) for a launched campaign. Source is "meta" or "placeholder". */
  getCampaignMetrics: (experimentId: string) =>
    request<CampaignMetricsResponse>(`experiments/${experimentId}/metrics`),

  /** Pause or activate campaign on Meta. Requires campaign linked to Meta (metaCampaignId). */
  updateCampaignStatus: (experimentId: string, status: "ACTIVE" | "PAUSED") =>
    request<{ ok: boolean; status: string }>(`experiments/${experimentId}/campaign-status`, {
      method: "PATCH",
      body: { status },
    }),

  /** Update daily budget on Meta (ad set level). Requires metaAdSetId. */
  updateCampaignBudget: (experimentId: string, dailyBudget: number) =>
    request<{ ok: boolean; dailyBudget: number }>(`experiments/${experimentId}/campaign-budget`, {
      method: "PATCH",
      body: { dailyBudget },
    }),

  /** Creatives library: list, create (upload), delete, get image URL */
  creatives: {
    list: () =>
      request<{ creatives: import("./types").Creative[] }>("creatives").then((r) => r.creatives),
    create: (name: string, imageData: string) =>
      request<{ id: string; name: string; createdAt: string }>("creatives", {
        method: "POST",
        body: { name, imageData },
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`creatives/${id}`, { method: "DELETE" }),
    /** Returns a URL that loads the creative image (via proxy). Call revokeObjectURL when done if you created one. */
    /** Fetch creative image with auth; returns object URL. Call URL.revokeObjectURL when done. */
    getAssetBlobUrl: async (id: string): Promise<string> => {
      const res = await fetch(`${API_BASE}/creatives/${id}/asset`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load creative");
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
  },

  /** List connected ad accounts (Meta, TikTok, Google) */
  integrations: {
    list: () =>
      request<{ integrations: ConnectedIntegration[] }>("integrations").then((r) => r.integrations),
    disconnect: (id: string) =>
      request<{ ok: boolean }>(`integrations/${id}`, { method: "DELETE" }),
    /** Meta ad accounts (requires Meta connected) */
    getMetaAdAccounts: () =>
      request<{ adAccounts: MetaAdAccount[] }>("integrations/meta/ad-accounts").then((r) => r.adAccounts),
    /** Test Meta connection (token + ad account access). Returns { ok, adAccountCount } or error. */
    testMetaConnection: () =>
      request<{ ok: true; adAccountCount: number } | { ok: false; error: string }>("integrations/meta/test"),
    /** TikTok ad accounts / advertisers (requires TikTok connected) */
    getTiktokAdAccounts: () =>
      request<{ adAccounts: MetaAdAccount[] }>("integrations/tiktok/ad-accounts").then((r) => r.adAccounts),
    /** Google Ads customer accounts (requires Google connected and GOOGLE_ADS_DEVELOPER_TOKEN on server) */
    getGoogleAdAccounts: () =>
      request<{ adAccounts: MetaAdAccount[] }>("integrations/google/ad-accounts").then((r) => r.adAccounts),
  },
};

export type CampaignMetricsResponse = {
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  cpm: number;
  clicks: number;
  ctr: number;
  cpc: number;
  linkClicks: number;
  conversions: number;
  costPerConversion: number;
  source: "placeholder" | "meta";
  datePreset?: string;
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
