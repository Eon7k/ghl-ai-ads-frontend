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
  /** null = all expansion products (legacy). [] = none. Else allowlist of product keys. */
  enabledProductKeys?: string[] | null;
  /** null = pre–business-model user (treat as onboarded). false = show onboarding. true = done or skipped. */
  businessOnboardingComplete?: boolean | null;
  businessModelProfile?: Record<string, unknown> | null;
  /** Email of the user row whose business profile is shown (agency account vs. client when viewing as). */
  businessProfileForEmail?: string;
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
    /** Graph API version used for these calls (from server META_GRAPH_API_VERSION, default v25.0). */
    graphApiVersion?: string;
    requestedPageId?: string | null;
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
    patchBusinessModel: (body: {
      profile?: Record<string, unknown>;
      markComplete?: boolean;
      skip?: boolean;
    }) =>
      request<{
        ok: boolean;
        businessModelProfile: unknown;
        businessOnboardingComplete: boolean | null;
      }>("auth/business-model", { method: "PATCH", body }),
  },

  /** Claude-powered plan (ANTHROPIC_API_KEY on backend; optional ANTHROPIC_CONTENT_STRATEGY_MODEL). */
  contentStrategy: {
    generate: (body: {
      userPrompt?: string;
      mode: "full" | "text_plus_prompts" | "ideas_only";
      horizon: "single" | "week" | "month";
    }) => request<{ markdown: string }>("content-strategy/generate", { method: "POST", body }),
    /** Structured posts + Basic CSV for Go High Level Social Planner. */
    generateForGhl: (body: {
      userPrompt?: string;
      mode: "full" | "text_plus_prompts" | "ideas_only";
      horizon: "single" | "week" | "month";
    }) =>
      request<{
        posts: {
          postAtSpecificTime: string;
          content: string;
          link?: string;
          imageUrls?: string;
          gifUrl?: string;
          videoUrls?: string;
        }[];
        csv: string;
      }>("content-strategy/generate-for-ghl", { method: "POST", body }),
  },

  /** Admin-only: overview, AI performance, users, and agency clients. */
  admin: {
    overview: () => request<AdminOverview>("admin/overview"),
    aiPerformance: () => request<AdminAiPerformance>("admin/ai-performance"),
    listUsers: () =>
      request<{
        users: {
          id: string;
          email: string;
          accountType: string;
          createdAt: string;
          enabledProductKeys: string[] | null;
        }[];
      }>("admin/users").then((r) => r.users),
    updateUserAccountType: (userId: string, accountType: "single" | "agency") =>
      request<{ ok: boolean; accountType: string }>(`admin/users/${userId}`, {
        method: "PATCH",
        body: { accountType },
      }),
    updateUserEntitlements: (userId: string, enabledProductKeys: string[] | null) =>
      request<{ ok: boolean; enabledProductKeys: string[] | null }>(`admin/users/${userId}`, {
        method: "PATCH",
        body: { enabledProductKeys },
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
    runMetaPermissionTests: (opts?: { metaAdAccountId?: string; metaPageId?: string }) => {
      const metaAdAccountId = opts?.metaAdAccountId?.trim();
      const metaPageId = opts?.metaPageId?.trim();
      const body: { metaAdAccountId?: string; metaPageId?: string } = {};
      if (metaAdAccountId) body.metaAdAccountId = metaAdAccountId;
      if (metaPageId) body.metaPageId = metaPageId;
      return request<MetaPermissionTestsResponse>("admin/meta-permission-tests", {
        method: "POST",
        body: Object.keys(body).length ? body : {},
      });
    },
    /** Go High Level Social Planner tokens — admin sets per portal user (client row). */
    getUserGhlSocialPlanner: (userId: string) =>
      request<
        | { configured: false; userId: string; email: string }
        | {
            configured: true;
            userId: string;
            email: string;
            locationId: string;
            label: string | null;
            tokenLast4: string;
          }
      >(`admin/users/${encodeURIComponent(userId)}/ghl-social-planner`),
    saveUserGhlSocialPlanner: (
      userId: string,
      body: {
        locationId: string;
        /** Omit to keep existing token when updating location only. */
        privateIntegrationToken?: string;
        label?: string | null;
      }
    ) =>
      request<{ ok: boolean }>(`admin/users/${encodeURIComponent(userId)}/ghl-social-planner`, {
        method: "PUT",
        body,
      }),
    deleteUserGhlSocialPlanner: (userId: string) =>
      request<{ ok: boolean }>(`admin/users/${encodeURIComponent(userId)}/ghl-social-planner`, {
        method: "DELETE",
      }),
  },

  /** Agency self-serve clients (agency account only) */
  agency: {
    listClients: () =>
      request<{
        clients: {
          id: string;
          email: string;
          loginDisabled: boolean;
          createdAt: string;
          businessOnboardingComplete: boolean | null;
        }[];
      }>("agency/clients").then((r) => r.clients),
    addClient: (email: string, allowLogin: boolean) =>
      request<{
        client: { id: string; email: string; loginDisabled: boolean; businessOnboardingComplete: boolean | null };
        tempPassword?: string;
      }>("agency/clients", {
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

  /** Mark experiment as launched. Meta: metaAdAccountId. TikTok: tiktokAdvertiserId. Google: googleAdsCustomerId + landingPageUrl. LinkedIn: linkedInSponsoredAccountId + linkedInOrganizationUrn + landingPageUrl. Use dryRun: true to create paused / test where supported. */
  launchExperiment: (
    id: string,
    options?: {
      aiCreativeCount?: number;
      metaAdAccountId?: string;
      tiktokAdvertiserId?: string;
      tiktokIdentityId?: string;
      tiktokIdentityType?: string;
      googleAdsCustomerId?: string;
      linkedInSponsoredAccountId?: string;
      linkedInOrganizationUrn?: string;
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
        ...(options?.linkedInSponsoredAccountId && { linkedInSponsoredAccountId: options.linkedInSponsoredAccountId }),
        ...(options?.linkedInOrganizationUrn && { linkedInOrganizationUrn: options.linkedInOrganizationUrn }),
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
      request<{
        adAccounts: MetaAdAccount[];
        /** Present when the list is empty: HTTP status per LinkedIn API attempt (v2 + rest) for support. */
        linkedInDiscovery?: {
          attempts: Array<{
            url: string;
            status: number;
            elementCount: number;
            topLevelKeys: string[];
            message?: string;
            sampleElementKeys?: string[];
          }>;
        };
      }>("integrations/linkedin/ad-accounts"),
    testLinkedInConnection: () =>
      request<{
        ok: true;
        adAccountCount: number;
        linkedInDiscovery?: {
          attempts: Array<{
            url: string;
            status: number;
            elementCount: number;
            topLevelKeys: string[];
            message?: string;
            sampleElementKeys?: string[];
          }>;
        };
      } | { ok: false; error: string }>("integrations/linkedin/test"),
    /**
     * Publishes an **organic** post to the Company Page main feed (not a dark ad creative).
     * Same LinkedIn connection as ads; `organizationUrn` = numeric Page id or `urn:li:organization:…`.
     */
    postLinkedInOrganic: (body: { organizationUrn: string; text: string; imageBase64?: string | null }) =>
      request<{ ok: true; postUrn: string; message: string }>("integrations/linkedin/organic-post", {
        method: "POST",
        body,
      }),
    /** Go High Level Social Planner — read-only: whether credentials exist for this workspace (tokens managed in Admin). */
    getGhlSocialPlanner: () =>
      request<
        | { configured: false }
        | {
            configured: true;
            locationId: string;
            label: string | null;
            tokenLast4: string;
          }
      >("integrations/ghl/social-planner"),
    pushGhlSocialPlannerCsv: (csv: string) =>
      request<{
        ok: boolean;
        status: number;
        csvImportId: string | null;
        response: unknown;
        message: string;
      }>("integrations/ghl/social-planner/push", { method: "POST", body: { csv } }),
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

export type ReportConfigInput = {
  reportName: string;
  frequency?: string;
  sendDay?: number | null;
  sendTime?: string | null;
  emailRecipients?: string[];
  includeSections?: Record<string, unknown>;
  reportFormat?: string;
  isActive?: boolean;
};

export type ReportConfigRow = {
  id: string;
  agencyId: string;
  clientId: string;
  reportName: string;
  frequency: string;
  sendDay: number | null;
  sendTime: string | null;
  emailRecipients: unknown;
  includeSections: unknown;
  reportFormat: string;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { generatedReports: number };
};

export type GeneratedReportRow = {
  id: string;
  configId: string;
  agencyId: string;
  clientId: string;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  fileUrlPdf: string | null;
  fileUrlHtml: string | null;
  status: string;
  sentAt: string | null;
  sentTo: unknown;
  createdAt: string;
};

export type CompetitorWatchInput = {
  competitorName: string;
  competitorWebsite?: string | null;
  competitorFacebookPageId?: string | null;
  competitorGoogleAdvertiserId?: string | null;
  keywords?: string[];
  platforms?: string[];
  isActive?: boolean;
};

export type CompetitorWatchRow = {
  id: string;
  agencyId: string;
  clientId: string;
  competitorName: string;
  competitorWebsite: string | null;
  competitorFacebookPageId: string | null;
  competitorGoogleAdvertiserId: string | null;
  keywords: unknown;
  platforms: unknown;
  isActive: boolean;
  lastScannedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { ads: number; insights: number };
};

export type CompetitorInsightRow = {
  id: string;
  watchId: string;
  generatedAt: string;
  summary: string;
  topThemes: unknown;
  suggestedCounterAngles: unknown;
  strongestAds: unknown;
  competitivePack?: unknown;
  rawPromptUsed?: string | null;
};

export type CompetitorAdRow = {
  id: string;
  watchId: string;
  platform: string;
  adLibraryId: string;
  headline: string | null;
  bodyText: string | null;
  /** Meta Ad Library snapshot preview, when the API returns it */
  mediaUrl?: string | null;
  destinationUrl: string | null;
  lastSeenAt: string;
};

export type CompetitorWatchDetail = CompetitorWatchRow & {
  insights: CompetitorInsightRow[];
  ads: CompetitorAdRow[];
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

  reports: {
    listConfigs: () =>
      request<{ configs: ReportConfigRow[] }>("api/agency/reports/configs"),
    getConfig: (id: string) => request<{ config: ReportConfigRow }>(`api/agency/reports/configs/${id}`),
    createConfig: (body: ReportConfigInput) =>
      request<{ config: ReportConfigRow }>("api/agency/reports/configs", { method: "POST", body }),
    updateConfig: (id: string, body: Partial<ReportConfigInput>) =>
      request<{ config: ReportConfigRow }>(`api/agency/reports/configs/${id}`, { method: "PATCH", body }),
    deleteConfig: (id: string) => request<{ ok: boolean }>(`api/agency/reports/configs/${id}`, { method: "DELETE" }),
    listGenerated: (configId: string) =>
      request<{ generated: GeneratedReportRow[] }>(`api/agency/reports/configs/${configId}/generated`),
    recordRun: (configId: string, body?: { reportPeriodStart?: string; reportPeriodEnd?: string }) =>
      request<{ generated: GeneratedReportRow }>(`api/agency/reports/configs/${configId}/record-run`, {
        method: "POST",
        body: body ?? {},
      }),
  },

  competitor: {
    listWatches: () => request<{ watches: CompetitorWatchRow[] }>("api/agency/competitor/watches"),
    getWatch: (id: string) => request<{ watch: CompetitorWatchDetail }>(`api/agency/competitor/watches/${id}`),
    createWatch: (body: CompetitorWatchInput) =>
      request<{ watch: CompetitorWatchRow }>("api/agency/competitor/watches", { method: "POST", body }),
    updateWatch: (id: string, body: Partial<CompetitorWatchInput>) =>
      request<{ watch: CompetitorWatchRow }>(`api/agency/competitor/watches/${id}`, { method: "PATCH", body }),
    deleteWatch: (id: string) => request<{ ok: boolean }>(`api/agency/competitor/watches/${id}`, { method: "DELETE" }),
    scanWatch: (id: string, summary?: string) =>
      request<{
        watch: CompetitorWatchDetail;
        insight: CompetitorInsightRow;
        /** What the server did during the scan (website, Meta, etc.) — not secrets. Omitted on older API builds. */
        diagnostics?: { scanNotes: string[] } | null;
      }>(`api/agency/competitor/watches/${id}/scan`, { method: "POST", body: summary ? { summary } : {} }),
    /** One Meta Ad Library ad id (from ads_archive `id`) → Facebook Page id for that advertiser. */
    resolvePageFromAdLibraryId: (adLibraryId: string) =>
      request<{
        pageId: string;
        pageName: string | null;
        adLibraryId: string;
        resolvedVia?: "archived_ad" | "page_id";
      }>("api/agency/competitor/resolve-page-from-ad-library-id", { method: "POST", body: { adLibraryId } }),
    /** Resolve a Page to numeric id (Ad Library “View all” link, page URL, @handle, or id). */
    resolveFacebookPage: (input: string) =>
      request<{
        pageId: string | null;
        source: "ad_library" | "direct" | "graph" | null;
        message?: string;
      }>("api/agency/competitor/resolve-facebook-page", { method: "POST", body: { input } }),
    /** Fetch the competitor’s public homepage and look for Facebook Page links (footer, etc.), then resolve to Page ids. */
    discoverFacebookPageFromWebsite: (
      website: string,
      options?: {
        companyName?: string;
        locationHint?: string;
        crawlEntireSite?: boolean;
        includeGooglePlace?: boolean;
      }
    ) =>
      request<{
        foundLinks: string[];
        candidates: { pageUrl: string; pageId: string; source: "ad_library" | "direct" | "graph" }[];
        message?: string;
        crawledPageCount: number;
        crawlEntireSite: boolean;
        googlePlace?: {
          textQuery: string;
          displayName: string | null;
          websiteUri: string | null;
          googleMapsUri: string | null;
          note: string;
        };
      }>("api/agency/competitor/discover-facebook-page-from-website", {
        method: "POST",
        body: { website, ...options },
      }),
    /** Meta Ad Library text search → advertiser Pages (`page_id`) that appear in matching ads (pick agency/shell Page when brand Page has no ads). */
    discoverMetaPagesFromAdLibrarySearch: (searchTerm: string) =>
      request<{
        candidates: { pageId: string; pageName: string | null; adsSeenInSample: number }[];
        message?: string;
      }>("api/agency/competitor/discover-meta-pages-from-ad-library-search", {
        method: "POST",
        body: { searchTerm },
      }),
  },
};
