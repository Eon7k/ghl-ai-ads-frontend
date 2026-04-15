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
    const d = data as { error?: unknown; message?: string; code?: string };
    const msg =
      typeof d?.message === "string"
        ? d.message
        : typeof d?.error === "string"
          ? d.error
          : `HTTP ${res.status}`;
    const code = typeof d?.code === "string" ? d.code : "";
    throw new Error(code ? `${msg} (${code})` : msg);
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

export type MetaPermissionTestRow = {
  id: string;
  label: string;
  useCases: ("captureLeads" | "measurePerformance")[];
  request: string;
  ok: boolean;
  detail?: string;
};

export type MetaPermissionTestsResponse = {
  summary: {
    adAccountId: string | null;
    pageId: string | null;
    pageTasks?: string[];
    allOk: boolean;
    suggestions?: string[];
  };
  results: MetaPermissionTestRow[];
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
    /** Run Graph API calls that map to Meta App Dashboard permission tests (admin’s connected Meta token). */
    runMetaPermissionTests: (metaAdAccountId?: string) =>
      request<MetaPermissionTestsResponse>("admin/meta-permission-tests", {
        method: "POST",
        body: metaAdAccountId?.trim() ? { metaAdAccountId: metaAdAccountId.trim() } : {},
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

  /** Update experiment (e.g. creative direction, target audience, AI optimization mode). */
  updateExperiment: (
    id: string,
    data: {
      creativePrompt?: string | null;
      targetAudiencePrompt?: string | null;
      aiOptimizationMode?: import("./types").AiOptimizationMode;
    }
  ) => request<import("./types").Experiment>(`experiments/${id}`, { method: "PATCH", body: data }),

  /** AI performance snapshot for any launched platform; may apply Meta budget when mode is auto. */
  getAiPerformanceInsights: (experimentId: string) =>
    request<{
      summary: string;
      suggestions: string[];
      recommendedDailyBudget: number | null;
      budgetAutoApplied: boolean;
      budgetNote?: string;
      metricsSource: string;
      platform: string;
      newTotalDailyBudget?: number;
    }>(`experiments/${experimentId}/ai-performance-insights`, { method: "POST", body: {} }),

  /** Preview Meta ad set targeting from natural-language audience (Meta campaigns only). */
  previewMetaTargeting: (experimentId: string, targetAudiencePrompt: string) =>
    request<{ targeting: Record<string, unknown> }>(`experiments/${experimentId}/preview-meta-targeting`, {
      method: "POST",
      body: { targetAudiencePrompt },
    }),

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

  /** Set variant image from library (creativeId) or upload (imageData base64 / data URL). */
  setVariantCreative: (
    experimentId: string,
    variantId: string,
    body: { creativeId: string } | { imageData: string }
  ) =>
    request<{ variant: import("./types").AdVariant }>(
      `experiments/${experimentId}/variants/${variantId}/set-creative`,
      { method: "POST", body }
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

  /** Mark experiment as launched. Meta: metaAdAccountId. TikTok: tiktokAdvertiserId. Google: googleAdsCustomerId + landingPageUrl. Use dryRun: true to create paused / test where supported. */
  launchExperiment: (
    id: string,
    options?: {
      aiCreativeCount?: number;
      metaAdAccountId?: string;
      tiktokAdvertiserId?: string;
      tiktokIdentityId?: string;
      tiktokIdentityType?: string;
      googleAdsCustomerId?: string;
      landingPageUrl?: string;
      dryRun?: boolean;
      variantIds?: string[];
    }
  ) =>
    request<import("./types").Experiment & { dryRun?: boolean }>(`experiments/${id}/launch`, {
      method: "POST",
      body: {
        ...(options?.aiCreativeCount != null && { aiCreativeCount: options.aiCreativeCount }),
        ...(options?.metaAdAccountId && { metaAdAccountId: options.metaAdAccountId }),
        ...(options?.tiktokAdvertiserId && { tiktokAdvertiserId: options.tiktokAdvertiserId }),
        ...(options?.tiktokIdentityId && { tiktokIdentityId: options.tiktokIdentityId }),
        ...(options?.tiktokIdentityType && { tiktokIdentityType: options.tiktokIdentityType }),
        ...(options?.googleAdsCustomerId && { googleAdsCustomerId: options.googleAdsCustomerId }),
        ...(options?.landingPageUrl && { landingPageUrl: options.landingPageUrl }),
        ...(options?.dryRun === true && { dryRun: true }),
        ...(options?.variantIds && options.variantIds.length > 0 && { variantIds: options.variantIds }),
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

  /** List connected ad accounts (Meta, TikTok, Google, LinkedIn) */
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
    /** TikTok identities for an advertiser (for ad creative “identity”; optional if backend auto-picks). */
    getTiktokIdentities: (advertiserId: string) =>
      request<{ identities: { identityId: string; identityType: string; displayName: string }[] }>(
        `integrations/tiktok/identities?advertiser_id=${encodeURIComponent(advertiserId)}`
      ).then((r) => r.identities),
    /** Google Ads customer accounts (requires Google connected and GOOGLE_ADS_DEVELOPER_TOKEN on server) */
    getGoogleAdAccounts: () =>
      request<{ adAccounts: MetaAdAccount[] }>("integrations/google/ad-accounts").then((r) => r.adAccounts),
    /** Test Google token + developer token + list accessible customers. */
    testGoogleConnection: () =>
      request<{ ok: true; customerCount: number } | { ok: false; error: string }>("integrations/google/test"),
    getLinkedInAdAccounts: () =>
      request<{ adAccounts: MetaAdAccount[] }>("integrations/linkedin/ad-accounts").then((r) => r.adAccounts),
    testLinkedInConnection: () =>
      request<{ ok: true; adAccountCount: number } | { ok: false; error: string }>("integrations/linkedin/test"),
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
  platform: "meta" | "tiktok" | "google" | "linkedin";
  platformAccountId?: string;
  platformAccountName?: string;
  createdAt: string;
};

/** White-label branding (Module 1) — public resolve-brand shape */
export type AgencyBrandingPublic = {
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  supportEmail: string | null;
  supportUrl: string | null;
  hidePoweredBy: boolean;
  onboardingWelcomeMessage: string | null;
};

export type AgencyBrandingRecord = AgencyBrandingPublic & {
  id: string;
  userId: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Stored JSON for landing page content (headline, CTAs, etc.). */
export type LandingPageData = {
  headline?: string;
  subheadline?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
};

export type LandingPageRecord = {
  id: string;
  agencyId: string;
  clientId: string;
  campaignId: string | null;
  title: string;
  slug: string;
  status: string;
  hostingType: string;
  subdomain: string | null;
  pageData: LandingPageData;
  aiGenerationPrompt: string | null;
  conversionGoal: string | null;
  conversionTrackingPixel: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  experiment?: { id: string; name: string; platform: string; status: string } | null;
};

async function expansionMultipart(
  path: string,
  formData: FormData
): Promise<{ ok: boolean; logoUrl?: string; faviconUrl?: string }> {
  const url = `${API_BASE}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
    mode: "cors",
    credentials: "omit",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { message?: string; code?: string };
    const msg = typeof d?.message === "string" ? d.message : `HTTP ${res.status}`;
    const code = typeof d?.code === "string" ? d.code : "";
    throw new Error(code ? `${msg} (${code})` : msg);
  }
  return data as { ok: boolean; logoUrl?: string; faviconUrl?: string };
}

/** Platform expansion API (proxied to backend `/api/*`). */
export const expansion = {
  resolveBrand: (domain: string) =>
    request<{ branding: AgencyBrandingPublic | null }>(
      `api/resolve-brand?domain=${encodeURIComponent(domain)}`,
      { skipAuth: true }
    ),
  getAgencyBranding: () => request<{ branding: AgencyBrandingRecord | null }>("api/agency/branding"),
  updateAgencyBranding: (body: Record<string, unknown>) =>
    request<{ branding: AgencyBrandingRecord }>("api/agency/branding", { method: "PUT", body }),
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return expansionMultipart("api/agency/branding/logo", fd);
  },
  uploadFavicon: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return expansionMultipart("api/agency/branding/favicon", fd);
  },
  initDomainVerify: (domain: string) =>
    request<{ ok: boolean; txtHost: string; txtValue: string; instructions: string }>(
      "api/agency/branding/domain/verify-init",
      { method: "POST", body: { domain } }
    ),
  checkDomainVerify: () =>
    request<{ ok: boolean; verified: boolean; message: string }>(
      "api/agency/branding/domain/verify-check",
      { method: "POST", body: {} }
    ),

  landingPages: {
    list: () => request<{ pages: LandingPageRecord[] }>("api/agency/landing-pages"),
    get: (id: string) => request<{ page: LandingPageRecord }>(`api/agency/landing-pages/${id}`),
    create: (body: {
      title: string;
      slug?: string;
      campaignId?: string | null;
      status?: string;
      hostingType?: string;
      subdomain?: string | null;
      pageData?: LandingPageData;
      aiGenerationPrompt?: string | null;
      conversionGoal?: string | null;
      conversionTrackingPixel?: string | null;
    }) =>
      request<{ page: LandingPageRecord }>("api/agency/landing-pages", { method: "POST", body }),
    update: (
      id: string,
      body: Partial<{
        title: string;
        slug: string;
        status: string;
        hostingType: string;
        subdomain: string | null;
        campaignId: string | null;
        pageData: LandingPageData | null;
        aiGenerationPrompt: string | null;
        conversionGoal: string | null;
        conversionTrackingPixel: string | null;
      }>
    ) => request<{ page: LandingPageRecord }>(`api/agency/landing-pages/${id}`, { method: "PATCH", body }),
    delete: (id: string) => request<{ ok: boolean }>(`api/agency/landing-pages/${id}`, { method: "DELETE" }),
  },
};
