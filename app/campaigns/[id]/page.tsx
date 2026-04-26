"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, type MetaAdAccount } from "@/lib/api";
import AdPreview from "@/components/AdPreview";
import { useAuth } from "@/contexts/AuthContext";
import type { Experiment, AdVariant, Creative, AiOptimizationMode } from "@/lib/types";
import { fileToUploadableDataUrl, isHeicFile, isLikelyImageFile } from "@/lib/imageUpload";

import type { CampaignMetricsResponse } from "@/lib/api";

/** Prefix for drag payload so card reorder (raw variant id) doesn’t clash with creative swap. */
const CREATIVE_SWAP_PREFIX = "creative-swap:";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const id = typeof params.id === "string" ? params.id : "";

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [variantCopies, setVariantCopies] = useState<Record<string, string>>({});
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);
  const [savedVariantId, setSavedVariantId] = useState<string | null>(null);
  const [regeneratingVariantId, setRegeneratingVariantId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [creativeUrls, setCreativeUrls] = useState<Record<string, string>>({});
  const [generatingCreativeId, setGeneratingCreativeId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState<string>("");
  const [budgetUpdating, setBudgetUpdating] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [metaAdAccounts, setMetaAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [selectedMetaAdAccountId, setSelectedMetaAdAccountId] = useState<string>("");
  const [tiktokAdAccounts, setTiktokAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [selectedTiktokAdvertiserId, setSelectedTiktokAdvertiserId] = useState<string>("");
  const [tiktokIdentities, setTiktokIdentities] = useState<
    { identityId: string; identityType: string; displayName: string }[] | null
  >(null);
  /** Empty = let backend auto-pick an identity. Otherwise "TYPE:id". */
  const [selectedTiktokIdentityKey, setSelectedTiktokIdentityKey] = useState<string>("");
  const [launchLandingPageUrl, setLaunchLandingPageUrl] = useState<string>("");
  const [metaTestLoading, setMetaTestLoading] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<{ ok: true; adAccountCount: number } | { ok: false; error: string } | null>(null);
  const [draggedVariantId, setDraggedVariantId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [draggedCreativeVariantId, setDraggedCreativeVariantId] = useState<string | null>(null);
  const [swapCreativesLoading, setSwapCreativesLoading] = useState(false);
  const [creativePromptInput, setCreativePromptInput] = useState("");
  const [savingCreativePrompt, setSavingCreativePrompt] = useState(false);
  const [targetAudienceInput, setTargetAudienceInput] = useState("");
  const [savingTargetAudience, setSavingTargetAudience] = useState(false);
  const [targetPreview, setTargetPreview] = useState<Record<string, unknown> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [redesigningVariantIds, setRedesigningVariantIds] = useState<Set<string>>(new Set());
  const [variantsSelectedForRedesign, setVariantsSelectedForRedesign] = useState<Set<string>>(new Set());
  const [variantsSelectedForLaunch, setVariantsSelectedForLaunch] = useState<Set<string>>(new Set());
  const [launchPickCount, setLaunchPickCount] = useState<string>("3");
  const [googleAdAccounts, setGoogleAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [selectedGoogleCustomerId, setSelectedGoogleCustomerId] = useState<string>("");
  const [googleTestLoading, setGoogleTestLoading] = useState(false);
  const [googleTestResult, setGoogleTestResult] = useState<
    { ok: true; customerCount: number } | { ok: false; error: string } | null
  >(null);
  const [linkedinAdAccounts, setLinkedinAdAccounts] = useState<MetaAdAccount[] | null>(null);
  /** When the list is empty, backend can return one row per API attempt (v2 + rest) for debugging. */
  const [linkedinDiscovery, setLinkedinDiscovery] = useState<
    | {
        attempts: Array<{
          url: string;
          status: number;
          elementCount: number;
          topLevelKeys: string[];
          message?: string;
          sampleElementKeys?: string[];
        }>;
      }
    | null
  >(null);
  /** When the ad-accounts request fails, we show this instead of the empty-list message. */
  const [linkedinAdAccountsError, setLinkedinAdAccountsError] = useState<string | null>(null);
  const [selectedLinkedinAccountId, setSelectedLinkedinAccountId] = useState<string>("");
  /** Company Page: numeric id or urn:li:organization:123 — required for UGC + creatives. */
  const [linkedinOrgUrnInput, setLinkedinOrgUrnInput] = useState<string>("");
  const [linkedinTestLoading, setLinkedinTestLoading] = useState(false);
  const [linkedinTestResult, setLinkedinTestResult] = useState<
    | { ok: true; adAccountCount: number; linkedInDiscovery?: { attempts: { url: string; status: number; elementCount: number; message?: string }[] } }
    | { ok: false; error: string }
    | null
  >(null);
  const prevExperimentIdRef = useRef<string | null>(null);
  const [libraryCreatives, setLibraryCreatives] = useState<Creative[]>([]);
  const [libraryPick, setLibraryPick] = useState<Record<string, string>>({});
  const [settingCreativeVariantId, setSettingCreativeVariantId] = useState<string | null>(null);
  const [attachCreativeErrors, setAttachCreativeErrors] = useState<Record<string, string>>({});
  const variantFileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const [createGenWarning, setCreateGenWarning] = useState<string | null>(null);
  const [optimizationModeDraft, setOptimizationModeDraft] = useState<AiOptimizationMode>("off");
  const [savingOptimizationMode, setSavingOptimizationMode] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsResult, setInsightsResult] = useState<{
    summary: string;
    suggestions: string[];
    recommendedDailyBudget: number | null;
    budgetAutoApplied: boolean;
    budgetNote?: string;
    metricsSource: string;
    platform: string;
  } | null>(null);

  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    const key = `ghl-ai-gen-warn:${id}`;
    const msg = sessionStorage.getItem(key);
    if (msg) {
      sessionStorage.removeItem(key);
      setCreateGenWarning(msg);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      try {
        const data = await api.getExperiment(id);
        if (cancelled) return;
        setExperiment(data);
        const copies: Record<string, string> = {};
        (data.variants || []).forEach((v) => {
          const text = (v.copy != null && String(v.copy).trim()) ? String(v.copy).trim() : "";
          copies[v.id] = text || `Variant ${v.index} — Ad copy`;
        });
        setVariantCopies(copies);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load campaign");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // When server sends empty copy, fill from server + fallback so preview isn't blank on first paint
  useEffect(() => {
    if (!experiment?.variants?.length) return;
    setVariantCopies((prev) => {
      let next: Record<string, string> | null = null;
      for (const v of experiment.variants!) {
        const serverCopy = (v.copy != null && String(v.copy).trim()) ? String(v.copy).trim() : "";
        const fallback = `Variant ${v.index} — Ad copy`;
        const value = serverCopy || fallback;
        const current = prev[v.id];
        if (current === undefined || (typeof current === "string" && !current.trim())) {
          if (!next) next = { ...prev };
          next[v.id] = value;
        }
      }
      return next ?? prev;
    });
  }, [experiment?.id, experiment?.variants]);

  // Sync creative direction input from experiment
  useEffect(() => {
    if (experiment) setCreativePromptInput(experiment.creativePrompt ?? "");
  }, [experiment?.id, experiment?.creativePrompt]);

  useEffect(() => {
    if (experiment) setTargetAudienceInput(experiment.targetAudiencePrompt ?? "");
  }, [experiment?.id, experiment?.targetAudiencePrompt]);

  useEffect(() => {
    const m = experiment?.aiOptimizationMode;
    if (m === "off" || m === "suggestions" || m === "auto") setOptimizationModeDraft(m);
    else setOptimizationModeDraft("off");
  }, [experiment?.id, experiment?.aiOptimizationMode]);

  // Init/update which variants are selected for launch (only those with creatives; reset when switching campaign)
  useEffect(() => {
    if (!experiment?.variants?.length) return;
    const withCreative = experiment.variants.filter((v) => v.hasCreative).map((v) => v.id);
    if (prevExperimentIdRef.current !== experiment.id) {
      prevExperimentIdRef.current = experiment.id;
      setVariantsSelectedForLaunch(new Set(withCreative));
    } else {
      setVariantsSelectedForLaunch((prev) => {
        const next = new Set(prev);
        let added = false;
        for (const id of withCreative) {
          if (!prev.has(id)) {
            next.add(id);
            added = true;
          }
        }
        return added ? next : prev;
      });
    }
  }, [experiment?.id, experiment?.variants]);

  function selectFirstNLaunchable(n: number) {
    if (!experiment?.variants?.length) return;
    const launchable = [...experiment.variants]
      .sort((a, b) => a.index - b.index)
      .filter((v) => v.hasCreative || creativeUrls[v.id])
      .slice(0, Math.max(0, n))
      .map((v) => v.id);
    setVariantsSelectedForLaunch(new Set(launchable));
  }

  // Load Meta ad accounts when this is a Meta draft (for launch to live)
  useEffect(() => {
    if (!experiment || experiment.platform !== "meta" || experiment.status !== "draft") return;
    api.integrations.getMetaAdAccounts()
      .then(setMetaAdAccounts)
      .catch(() => setMetaAdAccounts([]));
  }, [experiment?.id, experiment?.platform, experiment?.status]);

  useEffect(() => {
    if (!experiment || experiment.platform !== "tiktok" || experiment.status !== "draft") return;
    api.integrations
      .getTiktokAdAccounts()
      .then(setTiktokAdAccounts)
      .catch(() => setTiktokAdAccounts([]));
  }, [experiment?.id, experiment?.platform, experiment?.status]);

  useEffect(() => {
    if (!experiment || experiment.platform !== "google" || experiment.status !== "draft") return;
    api.integrations
      .getGoogleAdAccounts()
      .then(setGoogleAdAccounts)
      .catch(() => setGoogleAdAccounts([]));
  }, [experiment?.id, experiment?.platform, experiment?.status]);

  useEffect(() => {
    if (!experiment || experiment.platform !== "linkedin" || experiment.status !== "draft") return;
    setLinkedinAdAccountsError(null);
    setLinkedinDiscovery(null);
    api.integrations
      .getLinkedInAdAccounts()
      .then((r) => {
        setLinkedinAdAccounts(r.adAccounts);
        setLinkedinDiscovery(r.linkedInDiscovery ?? null);
        setLinkedinAdAccountsError(null);
      })
      .catch((e) => {
        setLinkedinAdAccounts([]);
        setLinkedinDiscovery(null);
        setLinkedinAdAccountsError(e instanceof Error ? e.message : "Could not load LinkedIn ad accounts");
      });
  }, [experiment?.id, experiment?.platform, experiment?.status]);

  useEffect(() => {
    if (!selectedTiktokAdvertiserId) {
      setTiktokIdentities(null);
      setSelectedTiktokIdentityKey("");
      return;
    }
    let cancelled = false;
    setTiktokIdentities(null);
    api.integrations
      .getTiktokIdentities(selectedTiktokAdvertiserId)
      .then((list) => {
        if (!cancelled) setTiktokIdentities(list);
      })
      .catch(() => {
        if (!cancelled) setTiktokIdentities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTiktokAdvertiserId]);

  useEffect(() => {
    if (!experiment || experiment.status !== "draft") {
      setLibraryCreatives([]);
      return;
    }
    let cancelled = false;
    api.creatives
      .list()
      .then((list) => {
        if (!cancelled) setLibraryCreatives(list);
      })
      .catch(() => {
        if (!cancelled) setLibraryCreatives([]);
      });
    return () => {
      cancelled = true;
    };
  }, [experiment?.id, experiment?.status]);

  // When launched, load metrics from backend (Meta when we have metaCampaignId, else placeholder)
  useEffect(() => {
    if (!experiment || experiment.status !== "launched") {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    setMetricsLoading(true);
    (async () => {
      try {
        const data = await api.getCampaignMetrics(experiment.id);
        if (!cancelled) setMetrics(data);
      } catch {
        if (!cancelled) setMetrics(null);
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [experiment?.id, experiment?.status]);

  // Sync budget input when experiment loads
  useEffect(() => {
    if (experiment?.totalDailyBudget != null) {
      setBudgetValue(String(experiment.totalDailyBudget));
    }
  }, [experiment?.id, experiment?.totalDailyBudget]);

  async function handleUpdateStatus(status: "ACTIVE" | "PAUSED") {
    if (!experiment) return;
    setStatusError(null);
    setStatusUpdating(true);
    try {
      await api.updateCampaignStatus(experiment.id, status);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleUpdateBudget() {
    if (!experiment) return;
    const num = Number(budgetValue);
    if (Number.isNaN(num) || num < 1) {
      setBudgetError("Enter a valid daily budget (min 1)");
      return;
    }
    setBudgetError(null);
    setBudgetUpdating(true);
    try {
      await api.updateCampaignBudget(experiment.id, num);
      setExperiment((prev) => (prev ? { ...prev, totalDailyBudget: num } : null));
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : "Failed to update budget");
    } finally {
      setBudgetUpdating(false);
    }
  }

  const creativeUrlsRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!experiment?.variants?.length) return;
    let cancelled = false;
    (async () => {
      const urls: Record<string, string> = {};
      for (const v of experiment.variants!) {
        if (!v.hasCreative) continue;
        try {
          const url = await api.getVariantCreativeBlobUrl(experiment.id, v.id);
          if (!cancelled) urls[v.id] = url;
        } catch {
          // ignore
        }
      }
      if (!cancelled) {
        creativeUrlsRef.current = urls;
        setCreativeUrls((prev) => ({ ...prev, ...urls }));
      }
    })();
    return () => {
      cancelled = true;
      Object.values(creativeUrlsRef.current).forEach(URL.revokeObjectURL);
      creativeUrlsRef.current = {};
    };
  }, [experiment?.id, experiment?.variants?.filter((v) => v.hasCreative).length]);

  const creativeUrlsToRevoke = useRef(creativeUrls);
  creativeUrlsToRevoke.current = creativeUrls;
  useEffect(() => {
    return () => {
      Object.values(creativeUrlsToRevoke.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  async function saveVariant(v: AdVariant) {
    const copy = variantCopies[v.id] ?? v.copy;
    if (copy === v.copy) return;
    setSavingVariantId(v.id);
    setSavedVariantId(null);
    try {
      await api.updateVariant(experiment!.id, v.id, copy);
      setExperiment((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants!.map((x) => (x.id === v.id ? { ...x, copy } : x)),
        };
      });
      setSavedVariantId(v.id);
      setTimeout(() => setSavedVariantId(null), 2000);
    } catch (e) {
      // Could set a per-variant error; for now we don't
    } finally {
      setSavingVariantId(null);
    }
  }

  async function regenerateVariant(v: AdVariant) {
    if (!experiment) return;
    setRegeneratingVariantId(v.id);
    try {
      const { copy } = await api.regenerateVariant(experiment.id, v.id);
      setVariantCopies((prev) => ({ ...prev, [v.id]: copy }));
      setExperiment((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants!.map((x) =>
            x.id === v.id ? { ...x, copy, aiSource: "openai" as const } : x
          ),
        };
      });
    } catch (e) {
      // Could show per-variant error
    } finally {
      setRegeneratingVariantId(null);
    }
  }

  async function generateCreative(v: AdVariant) {
    if (!experiment) return;
    setGeneratingCreativeId(v.id);
    try {
      await api.generateVariantCreative(experiment.id, v.id);
      const url = await api.getVariantCreativeBlobUrl(experiment.id, v.id);
      setCreativeUrls((prev) => ({ ...prev, [v.id]: url }));
      setExperiment((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants!.map((x) => (x.id === v.id ? { ...x, hasCreative: true } : x)),
        };
      });
    } catch (e) {
      // could set per-variant error
    } finally {
      setGeneratingCreativeId(null);
    }
  }

  async function applyLibraryCreativeToVariant(variantId: string, creativeId: string) {
    if (!experiment || !creativeId.trim()) return;
    setSettingCreativeVariantId(variantId);
    setAttachCreativeErrors((prev) => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
    try {
      await api.setVariantCreative(experiment.id, variantId, { creativeId: creativeId.trim() });
      setCreativeUrls((prev) => {
        const next = { ...prev };
        if (next[variantId]) URL.revokeObjectURL(next[variantId]);
        delete next[variantId];
        return next;
      });
      const url = await api.getVariantCreativeBlobUrl(experiment.id, variantId);
      setCreativeUrls((prev) => ({ ...prev, [variantId]: url }));
      setExperiment((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants.map((x) =>
            x.id === variantId ? { ...x, hasCreative: true } : x
          ),
        };
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not attach creative";
      setAttachCreativeErrors((prev) => ({ ...prev, [variantId]: msg }));
    } finally {
      setSettingCreativeVariantId(null);
    }
  }

  async function applyUploadCreativeToVariant(variantId: string, file: File) {
    if (!experiment) return;
    setAttachCreativeErrors((prev) => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
    if (isHeicFile(file)) {
      setAttachCreativeErrors((prev) => ({
        ...prev,
        [variantId]:
          "HEIC isn’t supported here. Export as JPG or use “Most Compatible” in iPhone camera settings.",
      }));
      return;
    }
    if (!isLikelyImageFile(file)) {
      setAttachCreativeErrors((prev) => ({
        ...prev,
        [variantId]: "Please choose an image (JPG, PNG, WebP, or GIF).",
      }));
      return;
    }
    setSettingCreativeVariantId(variantId);
    try {
      const imageData = await fileToUploadableDataUrl(file);
      await api.setVariantCreative(experiment.id, variantId, { imageData });
      setCreativeUrls((prev) => {
        const next = { ...prev };
        if (next[variantId]) URL.revokeObjectURL(next[variantId]);
        delete next[variantId];
        return next;
      });
      const url = await api.getVariantCreativeBlobUrl(experiment.id, variantId);
      setCreativeUrls((prev) => ({ ...prev, [variantId]: url }));
      setExperiment((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants.map((x) =>
            x.id === variantId ? { ...x, hasCreative: true } : x
          ),
        };
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setAttachCreativeErrors((prev) => ({ ...prev, [variantId]: msg }));
    } finally {
      setSettingCreativeVariantId(null);
    }
  }

  async function testMetaConnection() {
    setMetaTestLoading(true);
    setMetaTestResult(null);
    try {
      const result = await api.integrations.testMetaConnection();
      setMetaTestResult(result);
    } catch (e) {
      setMetaTestResult({ ok: false, error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setMetaTestLoading(false);
    }
  }

  async function testGoogleConnection() {
    setGoogleTestLoading(true);
    setGoogleTestResult(null);
    try {
      const result = await api.integrations.testGoogleConnection();
      setGoogleTestResult(result);
    } catch (e) {
      setGoogleTestResult({ ok: false, error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setGoogleTestLoading(false);
    }
  }

  async function testLinkedInConnection() {
    setLinkedinTestLoading(true);
    setLinkedinTestResult(null);
    try {
      const result = await api.integrations.testLinkedInConnection();
      setLinkedinTestResult(result);
    } catch (e) {
      setLinkedinTestResult({ ok: false, error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setLinkedinTestLoading(false);
    }
  }

  async function launch(dryRun: boolean) {
    if (!experiment || experiment.status === "launched") return;
    setLaunching(true);
    setLaunchError(null);
    const selectedWithCreative = variants.filter(
      (v) => (v.hasCreative || creativeUrls[v.id]) && variantsSelectedForLaunch.has(v.id)
    );
    const countWithCreatives = selectedWithCreative.length;
    const opts: {
      aiCreativeCount: number;
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
    } = { aiCreativeCount: countWithCreatives };
    if (experiment.platform === "meta" && selectedMetaAdAccountId) {
      opts.metaAdAccountId = selectedMetaAdAccountId;
      if (launchLandingPageUrl.trim()) opts.landingPageUrl = launchLandingPageUrl.trim();
      opts.dryRun = dryRun;
      if (variantsSelectedForLaunch.size > 0) opts.variantIds = Array.from(variantsSelectedForLaunch);
    }
    if (experiment.platform === "tiktok" && selectedTiktokAdvertiserId) {
      opts.tiktokAdvertiserId = selectedTiktokAdvertiserId;
      if (launchLandingPageUrl.trim()) opts.landingPageUrl = launchLandingPageUrl.trim();
      opts.dryRun = dryRun;
      if (variantsSelectedForLaunch.size > 0) opts.variantIds = Array.from(variantsSelectedForLaunch);
      if (selectedTiktokIdentityKey) {
        const sep = selectedTiktokIdentityKey.indexOf(":");
        if (sep > 0) {
          opts.tiktokIdentityType = selectedTiktokIdentityKey.slice(0, sep);
          opts.tiktokIdentityId = selectedTiktokIdentityKey.slice(sep + 1);
        }
      }
    }
    if (experiment.platform === "google" && selectedGoogleCustomerId) {
      opts.googleAdsCustomerId = selectedGoogleCustomerId.replace(/\D/g, "");
      if (launchLandingPageUrl.trim()) opts.landingPageUrl = launchLandingPageUrl.trim();
      opts.dryRun = dryRun;
      if (variantsSelectedForLaunch.size > 0) opts.variantIds = Array.from(variantsSelectedForLaunch);
    }
    if (
      experiment.platform === "linkedin" &&
      selectedLinkedinAccountId &&
      linkedinOrgUrnInput.trim()
    ) {
      opts.linkedInSponsoredAccountId = selectedLinkedinAccountId.replace(/\D/g, "");
      opts.linkedInOrganizationUrn = linkedinOrgUrnInput.trim();
      if (launchLandingPageUrl.trim()) opts.landingPageUrl = launchLandingPageUrl.trim();
      opts.dryRun = dryRun;
      if (variantsSelectedForLaunch.size > 0) opts.variantIds = Array.from(variantsSelectedForLaunch);
    }
    try {
      const updated = await api.launchExperiment(experiment.id, opts);
      setExperiment(updated);
    } catch (e) {
      setLaunchError(e instanceof Error ? e.message : "Failed to launch");
    } finally {
      setLaunching(false);
    }
  }

  function handleLaunchLive() {
    if (!experiment || experiment.status === "launched") return;
    const platformLabel =
      experiment.platform === "tiktok"
        ? "TikTok"
        : experiment.platform === "google"
          ? "Google Ads"
          : experiment.platform === "linkedin"
            ? "LinkedIn"
            : "Meta";
    const confirmed = window.confirm(
      `Are you sure you want to launch this campaign live? It will start running on ${platformLabel} and may incur spend.`
    );
    if (confirmed) launch(false);
  }

  function handleLaunchDryRun() {
    launch(true);
  }

  async function saveOptimizationMode() {
    if (!experiment) return;
    setSavingOptimizationMode(true);
    setInsightsError(null);
    try {
      const updated = await api.updateExperiment(experiment.id, { aiOptimizationMode: optimizationModeDraft });
      setExperiment((prev) =>
        prev ? { ...prev, ...updated, variants: prev.variants } : null
      );
    } catch (e) {
      setInsightsError(e instanceof Error ? e.message : "Could not save optimization mode");
    } finally {
      setSavingOptimizationMode(false);
    }
  }

  async function runAiPerformanceReview() {
    if (!experiment) return;
    setInsightsLoading(true);
    setInsightsError(null);
    setInsightsResult(null);
    try {
      const r = await api.getAiPerformanceInsights(experiment.id);
      setInsightsResult(r);
      if (r.newTotalDailyBudget != null) {
        setExperiment((prev) =>
          prev ? { ...prev, totalDailyBudget: r.newTotalDailyBudget! } : null
        );
        setBudgetValue(String(r.newTotalDailyBudget));
      }
    } catch (e) {
      setInsightsError(e instanceof Error ? e.message : "AI insights failed");
    } finally {
      setInsightsLoading(false);
    }
  }

  const sortedVariants = [...(experiment?.variants ?? [])].sort((a, b) => a.index - b.index);

  async function handleVariantReorder(draggedId: string, dropTargetId: string) {
    if (!experiment || draggedId === dropTargetId) return;
    const list = [...sortedVariants];
    const fromIdx = list.findIndex((v) => v.id === draggedId);
    const toIdx = list.findIndex((v) => v.id === dropTargetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [removed] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, removed);
    const variantIds = list.map((v) => v.id);
    setReordering(true);
    try {
      const { variants: updatedVariants } = await api.reorderVariants(experiment.id, variantIds);
      setExperiment((prev) => (prev ? { ...prev, variants: updatedVariants } : null));
    } finally {
      setReordering(false);
    }
  }

  async function saveCreativePrompt() {
    if (!experiment) return;
    setSavingCreativePrompt(true);
    try {
      await api.updateExperiment(experiment.id, { creativePrompt: creativePromptInput.trim() || null });
      setExperiment((prev) => (prev ? { ...prev, creativePrompt: creativePromptInput.trim() || undefined } : null));
    } finally {
      setSavingCreativePrompt(false);
    }
  }

  async function saveTargetAudience() {
    if (!experiment) return;
    setSavingTargetAudience(true);
    setPreviewError(null);
    try {
      await api.updateExperiment(experiment.id, { targetAudiencePrompt: targetAudienceInput.trim() || null });
      setExperiment((prev) => (prev ? { ...prev, targetAudiencePrompt: targetAudienceInput.trim() || undefined } : null));
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingTargetAudience(false);
    }
  }

  async function previewTargetAudience() {
    if (!experiment || experiment.platform !== "meta") return;
    const text = targetAudienceInput.trim();
    if (!text) {
      setPreviewError("Enter a description first");
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const { targeting } = await api.previewMetaTargeting(experiment.id, text);
      setTargetPreview(targeting);
    } catch (e) {
      setTargetPreview(null);
      setPreviewError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function redesignCreatives(variantIds: string[]) {
    if (!experiment || variantIds.length === 0) return;
    const promptDirty = (creativePromptInput.trim() || "") !== (experiment.creativePrompt ?? "");
    if (promptDirty) {
      setSavingCreativePrompt(true);
      try {
        await api.updateExperiment(experiment.id, { creativePrompt: creativePromptInput.trim() || null });
        setExperiment((prev) => (prev ? { ...prev, creativePrompt: creativePromptInput.trim() || undefined } : null));
      } finally {
        setSavingCreativePrompt(false);
      }
    }
    setRedesigningVariantIds(new Set(variantIds));
    for (const variantId of variantIds) {
      try {
        await api.generateVariantCreative(experiment.id, variantId);
        const url = await api.getVariantCreativeBlobUrl(experiment.id, variantId);
        setCreativeUrls((prev) => ({ ...prev, [variantId]: url }));
        setExperiment((prev) => {
          if (!prev?.variants) return prev;
          return { ...prev, variants: prev.variants.map((x) => (x.id === variantId ? { ...x, hasCreative: true } : x)) };
        });
      } catch (_e) {
        // continue with next
      } finally {
        setRedesigningVariantIds((prev) => {
          const next = new Set(prev);
          next.delete(variantId);
          return next;
        });
      }
    }
  }

  async function handleSwapCreatives(variantIdA: string, variantIdB: string) {
    if (!experiment || variantIdA === variantIdB) return;
    setSwapCreativesLoading(true);
    try {
      const { variants: updated } = await api.swapVariantCreatives(experiment.id, variantIdA, variantIdB);
      setExperiment((prev) => {
        if (!prev?.variants) return prev;
        const byId = new Map(updated.map((u) => [u.id, u]));
        return { ...prev, variants: prev.variants.map((v) => byId.get(v.id) ?? v) };
      });
      setCreativeUrls((prev) => {
        const next = { ...prev };
        [variantIdA, variantIdB].forEach((id) => {
          if (next[id]) URL.revokeObjectURL(next[id]);
          delete next[id];
        });
        return next;
      });
      const [urlA, urlB] = await Promise.all([
        api.getVariantCreativeBlobUrl(experiment.id, variantIdA),
        api.getVariantCreativeBlobUrl(experiment.id, variantIdB),
      ]);
      setCreativeUrls((prev) => ({ ...prev, [variantIdA]: urlA, [variantIdB]: urlB }));
    } finally {
      setSwapCreativesLoading(false);
      setDraggedCreativeVariantId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-zinc-600">Loading campaign...</p>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="p-6">
        <Link href="/" className="text-blue-600 hover:underline text-sm block mb-2">
          ← Back to Campaigns
        </Link>
        <p className="text-red-600">{error || "Campaign not found."}</p>
      </div>
    );
  }

  const variants = experiment.variants || [];
  const isDraft = experiment.status === "draft";
  const launchableSelectedCount = variants.filter(
    (v) => (v.hasCreative || creativeUrls[v.id]) && variantsSelectedForLaunch.has(v.id)
  ).length;
  const showPlatformLaunchControls =
    (experiment.platform === "meta" && !!selectedMetaAdAccountId) ||
    (experiment.platform === "tiktok" && !!selectedTiktokAdvertiserId) ||
    (experiment.platform === "google" && !!selectedGoogleCustomerId) ||
    (experiment.platform === "linkedin" &&
      !!selectedLinkedinAccountId &&
      !!linkedinOrgUrnInput.trim() &&
      !!launchLandingPageUrl.trim());
  return (
    <>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">
            ← Back to Campaigns
          </Link>
        </div>

        {createGenWarning && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p>{createGenWarning}</p>
            <button
              type="button"
              onClick={() => setCreateGenWarning(null)}
              className="shrink-0 rounded border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{experiment.name}</h1>
          <p className="text-zinc-600 text-sm mt-1">
            {experiment.platform.toUpperCase()} · ${experiment.totalDailyBudget}/day total
            {variants.length > 0 && ` · ${variants.length} variant${variants.length === 1 ? "" : "s"}`}
            {experiment.platform === "meta" && variants.length > 0
              ? ` — Meta: one ad set per variant (~$${(Math.round((experiment.totalDailyBudget / variants.length) * 100) / 100).toFixed(2)}/day each)`
              : variants.length > 0
                ? " — budget shared across live ads"
                : ""}
            {experiment.status === "launched" && experiment.googleCampaignId && (
              <span className="block mt-1 text-xs text-zinc-500">
                Google Ads campaign id {experiment.googleCampaignId}
                {experiment.googleAdGroupId ? ` · ad group ${experiment.googleAdGroupId}` : ""}
              </span>
            )}
            {experiment.status === "launched" && experiment.linkedinCampaignId && (
              <span className="block mt-1 max-w-2xl space-y-1 text-xs text-zinc-500">
                <span className="block">
                  LinkedIn campaign group {experiment.linkedinCampaignGroupId ?? "—"} · campaign{" "}
                  {experiment.linkedinCampaignId}
                  {experiment.linkedinSponsoredAccountId ? (
                    <>
                      {" "}
                      · ad account <span className="font-mono">{experiment.linkedinSponsoredAccountId}</span>
                    </>
                  ) : null}
                </span>
                {experiment.linkedinSponsoredAccountId ? (
                  <span className="block text-zinc-600">
                    <a
                      className="text-blue-700 underline"
                      href={`https://www.linkedin.com/campaignmanager/accounts/${encodeURIComponent(experiment.linkedinSponsoredAccountId)}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open this ad account in Campaign Manager
                    </a>
                    . The site-wide Campaign Manager home often opens a <strong>different</strong> default account than the
                    one the API used—if the URL does not show{" "}
                    <span className="font-mono">…/accounts/{experiment.linkedinSponsoredAccountId}</span>, switch accounts
                    (top) or use this link, then set the campaign list to <strong>Draft</strong> or <strong>All</strong> (not
                    Active only). Dry runs are <strong>DRAFT</strong> group and campaign. Creatives use{" "}
                    <strong>direct sponsored (dark) posts</strong> — they are not the Page’s organic feed.
                  </span>
                ) : (
                  <span className="block text-zinc-600">
                    In{" "}
                    <a
                      className="text-blue-700 underline"
                      href="https://www.linkedin.com/campaignmanager"
                      rel="noreferrer"
                      target="_blank"
                    >
                      Campaign Manager
                    </a>
                    , open the <strong>same sponsored ad account</strong> you selected at launch, then set the campaign list
                    filter to <strong>Draft</strong> or <strong>All</strong>. Relaunch with a current backend to store the
                    ad account id and show a direct link here.
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block px-3 py-1 rounded text-sm font-medium ${
              isDraft ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
            }`}
          >
            {experiment.status === "draft" ? "Draft" : "Launched"}
          </span>
          {isDraft && (
            <div className="flex flex-col gap-3">
              {experiment.platform === "meta" && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
                  <p className="mb-2 text-sm font-medium text-zinc-700">Launch to Meta (live)</p>
                  {metaAdAccounts === null ? (
                    <p className="text-xs text-zinc-500">Loading ad accounts…</p>
                  ) : metaAdAccounts.length === 0 ? (
                    <p className="text-xs text-amber-700">Connect Meta in Integrations to launch to a real ad account.</p>
                  ) : (
                    <>
                      <label className="block text-xs text-zinc-600">Ad account</label>
                      <select
                        value={selectedMetaAdAccountId}
                        onChange={(e) => setSelectedMetaAdAccountId(e.target.value)}
                        className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                      >
                        <option value="">— Don’t create on Meta (draft only) —</option>
                        {metaAdAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.id})
                          </option>
                        ))}
                      </select>
                      {selectedMetaAdAccountId && (
                        <>
                          <label className="mt-2 block text-xs text-zinc-600">
                            Landing page URL (used for ad destination and Meta ad set website promotion)
                          </label>
                          <input
                            type="url"
                            value={launchLandingPageUrl}
                            onChange={(e) => setLaunchLandingPageUrl(e.target.value)}
                            placeholder="https://yoursite.com/landing"
                            className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={testMetaConnection}
                              disabled={metaTestLoading}
                              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                            >
                              {metaTestLoading ? "Testing…" : "Test Meta connection"}
                            </button>
                            {metaTestResult && (
                              <span className={`text-xs ${metaTestResult.ok ? "text-green-700" : "text-red-700"}`}>
                                {metaTestResult.ok
                                  ? `Connected — ${metaTestResult.adAccountCount} ad account(s)`
                                  : metaTestResult.error}
                              </span>
                            )}
                          </div>
                          {sortedVariants.some((v) => v.hasCreative || creativeUrls[v.id]) && (
                            <div className="mt-3">
                              <p className="mb-2 text-xs font-medium text-zinc-700">Variants to launch</p>
                              <p className="mb-2 text-[11px] text-zinc-500">Only selected variants will be included in the campaign. Only variants with creatives can be launched.</p>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setVariantsSelectedForLaunch(new Set(sortedVariants.filter((v) => v.hasCreative || creativeUrls[v.id]).map((v) => v.id)))}
                                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Select all
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVariantsSelectedForLaunch(new Set())}
                                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Clear
                                </button>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-zinc-500">Pick first</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={sortedVariants.length}
                                    value={launchPickCount}
                                    onChange={(e) => setLaunchPickCount(e.target.value)}
                                    className="h-7 w-16 rounded border border-zinc-300 bg-white px-2 text-xs text-zinc-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => selectFirstNLaunchable(Number(launchPickCount) || 0)}
                                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {sortedVariants.map((v) => {
                                  const hasCreative = v.hasCreative || creativeUrls[v.id];
                                  if (!hasCreative) return null;
                                  return (
                                    <label key={v.id} className="flex cursor-pointer items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={variantsSelectedForLaunch.has(v.id)}
                                        onChange={(e) => {
                                          setVariantsSelectedForLaunch((prev) => {
                                            const next = new Set(prev);
                                            if (e.target.checked) next.add(v.id);
                                            else next.delete(v.id);
                                            return next;
                                          });
                                        }}
                                        className="rounded border-zinc-300"
                                      />
                                      <span className="text-sm text-zinc-800">Variant {v.index}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              {experiment.platform === "tiktok" && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
                  <p className="mb-2 text-sm font-medium text-zinc-700">Launch to TikTok Ads</p>
                  {tiktokAdAccounts === null ? (
                    <p className="text-xs text-zinc-500">Loading advertisers…</p>
                  ) : tiktokAdAccounts.length === 0 ? (
                    <p className="text-xs text-amber-700">Connect TikTok in Integrations to launch to a real ad account.</p>
                  ) : (
                    <>
                      <label className="block text-xs text-zinc-600">Advertiser (ad account)</label>
                      <select
                        value={selectedTiktokAdvertiserId}
                        onChange={(e) => setSelectedTiktokAdvertiserId(e.target.value)}
                        className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                      >
                        <option value="">— Don’t create on TikTok (draft only) —</option>
                        {tiktokAdAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.id})
                          </option>
                        ))}
                      </select>
                      {selectedTiktokAdvertiserId && (
                        <>
                          <label className="mt-2 block text-xs text-zinc-600">
                            Posting identity (optional)
                          </label>
                          {tiktokIdentities === null && (
                            <p className="mt-1 text-xs text-zinc-500">Loading identities…</p>
                          )}
                          <select
                            value={selectedTiktokIdentityKey}
                            onChange={(e) => setSelectedTiktokIdentityKey(e.target.value)}
                            disabled={tiktokIdentities === null}
                            className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
                          >
                            <option value="">Automatic — use first available identity</option>
                            {(tiktokIdentities ?? []).map((i) => (
                              <option
                                key={`${i.identityType}:${i.identityId}`}
                                value={`${i.identityType}:${i.identityId}`}
                              >
                                {i.displayName} ({i.identityType})
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            If launch fails with an identity error, create or link a TikTok identity in TikTok Ads Manager
                            for this advertiser, then retry or pick it here.
                          </p>
                          <label className="mt-2 block text-xs text-zinc-600">Landing page URL</label>
                          <input
                            type="url"
                            value={launchLandingPageUrl}
                            onChange={(e) => setLaunchLandingPageUrl(e.target.value)}
                            placeholder="https://your-site.com"
                            className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                          />
                          {sortedVariants.some((v) => v.hasCreative || creativeUrls[v.id]) && (
                            <div className="mt-3">
                              <p className="mb-2 text-xs font-medium text-zinc-700">Variants to launch</p>
                              <p className="mb-2 text-[11px] text-zinc-500">
                                Only selected variants with creatives are pushed as TikTok ads (single-image format).
                              </p>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVariantsSelectedForLaunch(
                                      new Set(sortedVariants.filter((v) => v.hasCreative || creativeUrls[v.id]).map((v) => v.id))
                                    )
                                  }
                                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Select all
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVariantsSelectedForLaunch(new Set())}
                                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Clear
                                </button>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-zinc-500">Pick first</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={sortedVariants.length}
                                    value={launchPickCount}
                                    onChange={(e) => setLaunchPickCount(e.target.value)}
                                    className="h-7 w-16 rounded border border-zinc-300 bg-white px-2 text-xs text-zinc-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => selectFirstNLaunchable(Number(launchPickCount) || 0)}
                                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {sortedVariants.map((v) => {
                                  const hasCreative = v.hasCreative || creativeUrls[v.id];
                                  if (!hasCreative) return null;
                                  return (
                                    <label key={v.id} className="flex cursor-pointer items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={variantsSelectedForLaunch.has(v.id)}
                                        onChange={(e) => {
                                          setVariantsSelectedForLaunch((prev) => {
                                            const next = new Set(prev);
                                            if (e.target.checked) next.add(v.id);
                                            else next.delete(v.id);
                                            return next;
                                          });
                                        }}
                                        className="rounded border-zinc-300"
                                      />
                                      <span className="text-sm text-zinc-800">Variant {v.index}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              {experiment.platform === "google" && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
                  <p className="mb-2 text-sm font-medium text-zinc-700">Launch to Google Ads</p>
                  <p className="mb-2 text-[11px] text-zinc-500">
                    Creates a <strong>Display</strong> campaign with responsive display ads (one ad per selected variant).
                    Backend needs <code className="rounded bg-zinc-200 px-1">GOOGLE_ADS_DEVELOPER_TOKEN</code> and a
                    valid OAuth refresh token. Dry run keeps everything paused in Google Ads.
                  </p>
                  {googleAdAccounts === null ? (
                    <p className="text-xs text-zinc-500">Loading Google Ads accounts…</p>
                  ) : googleAdAccounts.length === 0 ? (
                    <p className="text-xs text-amber-700">
                      Connect Google in Integrations and ensure the server has a developer token to list customer ids.
                    </p>
                  ) : (
                    <>
                      <label className="block text-xs text-zinc-600">Customer account</label>
                      <select
                        value={selectedGoogleCustomerId}
                        onChange={(e) => setSelectedGoogleCustomerId(e.target.value)}
                        className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                      >
                        <option value="">— Don’t create in Google Ads (draft only) —</option>
                        {googleAdAccounts.map((a) => (
                          <option key={a.id} value={a.accountId || a.id}>
                            {a.name} ({a.accountId || a.id})
                          </option>
                        ))}
                      </select>
                      {selectedGoogleCustomerId && (
                        <>
                          <label className="mt-2 block text-xs text-zinc-600">Landing page URL (required)</label>
                          <input
                            type="url"
                            value={launchLandingPageUrl}
                            onChange={(e) => setLaunchLandingPageUrl(e.target.value)}
                            placeholder="https://your-site.com/offer"
                            className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={testGoogleConnection}
                              disabled={googleTestLoading}
                              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                            >
                              {googleTestLoading ? "Testing…" : "Test Google Ads API"}
                            </button>
                            {googleTestResult && (
                              <span className={`text-xs ${googleTestResult.ok ? "text-green-700" : "text-red-700"}`}>
                                {googleTestResult.ok
                                  ? `OK — ${googleTestResult.customerCount} accessible customer(s)`
                                  : googleTestResult.error}
                              </span>
                            )}
                          </div>
                          {sortedVariants.some((v) => v.hasCreative || creativeUrls[v.id]) && (
                            <div className="mt-3">
                              <p className="mb-2 text-xs font-medium text-zinc-700">Variants to launch</p>
                              <p className="mb-2 text-[11px] text-zinc-500">
                                Each selected variant becomes a responsive display ad in one ad group.
                              </p>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVariantsSelectedForLaunch(
                                      new Set(
                                        sortedVariants
                                          .filter((v) => v.hasCreative || creativeUrls[v.id])
                                          .map((v) => v.id)
                                      )
                                    )
                                  }
                                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Select all
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVariantsSelectedForLaunch(new Set())}
                                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Clear
                                </button>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-zinc-500">Pick first</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={sortedVariants.length}
                                    value={launchPickCount}
                                    onChange={(e) => setLaunchPickCount(e.target.value)}
                                    className="h-7 w-16 rounded border border-zinc-300 bg-white px-2 text-xs text-zinc-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => selectFirstNLaunchable(Number(launchPickCount) || 0)}
                                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {sortedVariants.map((v) => {
                                  const hasCreative = v.hasCreative || creativeUrls[v.id];
                                  if (!hasCreative) return null;
                                  return (
                                    <label key={v.id} className="flex cursor-pointer items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={variantsSelectedForLaunch.has(v.id)}
                                        onChange={(e) => {
                                          setVariantsSelectedForLaunch((prev) => {
                                            const next = new Set(prev);
                                            if (e.target.checked) next.add(v.id);
                                            else next.delete(v.id);
                                            return next;
                                          });
                                        }}
                                        className="rounded border-zinc-300"
                                      />
                                      <span className="text-sm text-zinc-800">Variant {v.index}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              {experiment.platform === "linkedin" && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
                  <p className="mb-2 text-sm font-medium text-zinc-700">Launch to LinkedIn Ads</p>
                  <p className="mb-2 text-[11px] text-zinc-500">
                    Creates a sponsored updates / website visit campaign with one creative per selected variant. Posts and
                    images are authored as your{" "}
                    <strong>Company Page</strong> — use that Page&apos;s numeric id (or{" "}
                    <code className="rounded bg-zinc-200 px-1">urn:li:organization:…</code>). If asset or post steps return
                    403, add <code className="rounded bg-zinc-200 px-1">w_organization_social</code> to your LinkedIn app
                    scopes and reconnect. Dry run creates the <strong>campaign group</strong> and <strong>campaign</strong>{" "}
                    as <code className="rounded bg-zinc-200 px-1">DRAFT</code> under the{" "}
                    <strong>selected ad account</strong> — in Campaign Manager you must open that same account (after launch
                    we show a direct link) or drafts can look empty. <strong>Creatives</strong> are created{" "}
                    <code className="rounded bg-zinc-200 px-1">ACTIVE</code> (LinkedIn does not allow{" "}
                    <code className="rounded bg-zinc-200 px-1">PAUSED</code> on new creatives until review is approved). Review
                    and activate or pause in Campaign Manager before spend.
                  </p>
                  {linkedinAdAccounts === null ? (
                    <p className="text-xs text-zinc-500">Loading ad accounts…</p>
                  ) : linkedinAdAccountsError ? (
                    <p className="text-xs text-red-800">
                      <span className="font-medium">Could not load ad accounts.</span> {linkedinAdAccountsError} Check
                      backend logs, then LinkedIn app → Marketing / Ads product, and reconnect LinkedIn in this app.
                    </p>
                  ) : linkedinAdAccounts.length === 0 ? (
                    <div className="space-y-2 text-xs text-amber-800">
                      <p>
                        No ad accounts in the response. The LinkedIn member authorized in the browser (when you clicked
                        Connect) must be the same one with access in Campaign Manager. The app also needs{" "}
                        <code className="rounded bg-amber-100 px-1">r_ads</code> /{" "}
                        <code className="rounded bg-amber-100 px-1">rw_ads</code> (reconnect after scopes change). If
                        you see <strong>401</strong> in the details below, reconnect LinkedIn; <strong>403</strong> =
                        app/product/scope issue on LinkedIn&apos;s side.
                      </p>
                      {linkedinDiscovery?.attempts && linkedinDiscovery.attempts.length > 0 && (
                        <details className="rounded border border-amber-200 bg-amber-50/50 p-2 text-[11px] text-zinc-800">
                          <summary className="cursor-pointer font-medium">LinkedIn API attempts (for support)</summary>
                          <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-[10px] text-zinc-700">
                            {linkedinDiscovery.attempts.map((a, i) => (
                              <li key={i}>
                                {a.url} → HTTP {a.status}
                                {a.elementCount > 0 ? `, elements: ${a.elementCount}` : ""}
                                {a.message ? ` — ${a.message}` : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  ) : (
                    <>
                      <label className="block text-xs text-zinc-600">Sponsored ad account</label>
                      <select
                        value={selectedLinkedinAccountId}
                        onChange={(e) => setSelectedLinkedinAccountId(e.target.value)}
                        className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                      >
                        <option value="">— Select an account —</option>
                        {linkedinAdAccounts.map((a) => (
                          <option key={a.id} value={a.accountId || a.id}>
                            {a.name} ({a.accountId || a.id})
                          </option>
                        ))}
                      </select>
                      {selectedLinkedinAccountId && (
                        <>
                          <label className="mt-2 block text-xs text-zinc-600">
                            Company Page id or URN (required — ads post as this organization)
                          </label>
                          <input
                            type="text"
                            value={linkedinOrgUrnInput}
                            onChange={(e) => setLinkedinOrgUrnInput(e.target.value)}
                            placeholder="e.g. 12345678 or urn:li:organization:12345678"
                            className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                          />
                          <label className="mt-2 block text-xs text-zinc-600">Landing page URL (https, required)</label>
                          <input
                            type="url"
                            value={launchLandingPageUrl}
                            onChange={(e) => setLaunchLandingPageUrl(e.target.value)}
                            placeholder="https://your-site.com/offer"
                            className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                          />
                        </>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={testLinkedInConnection}
                          disabled={linkedinTestLoading}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {linkedinTestLoading ? "Testing…" : "Test LinkedIn API"}
                        </button>
                        {linkedinTestResult && (
                          <span className={`text-xs ${linkedinTestResult.ok ? "text-green-700" : "text-red-700"}`}>
                            {linkedinTestResult.ok
                              ? `OK — ${linkedinTestResult.adAccountCount} ad account(s)`
                              : linkedinTestResult.error}
                          </span>
                        )}
                      </div>
                      {selectedLinkedinAccountId &&
                        sortedVariants.some((v) => v.hasCreative || creativeUrls[v.id]) && (
                          <div className="mt-3">
                            <p className="mb-2 text-xs font-medium text-zinc-700">Variants to launch</p>
                            <p className="mb-2 text-[11px] text-zinc-500">
                              Each selected variant becomes a sponsored creative (image + copy) in the campaign.
                            </p>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setVariantsSelectedForLaunch(
                                    new Set(
                                      sortedVariants
                                        .filter((v) => v.hasCreative || creativeUrls[v.id])
                                        .map((v) => v.id)
                                    )
                                  )
                                }
                                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={() => setVariantsSelectedForLaunch(new Set())}
                                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                Clear
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-zinc-500">Pick first</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={sortedVariants.length}
                                  value={launchPickCount}
                                  onChange={(e) => setLaunchPickCount(e.target.value)}
                                  className="h-7 w-16 rounded border border-zinc-300 bg-white px-2 text-xs text-zinc-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => selectFirstNLaunchable(Number(launchPickCount) || 0)}
                                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {sortedVariants.map((v) => {
                                const hasCreative = v.hasCreative || creativeUrls[v.id];
                                if (!hasCreative) return null;
                                return (
                                  <label key={v.id} className="flex cursor-pointer items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={variantsSelectedForLaunch.has(v.id)}
                                      onChange={(e) => {
                                        setVariantsSelectedForLaunch((prev) => {
                                          const next = new Set(prev);
                                          if (e.target.checked) next.add(v.id);
                                          else next.delete(v.id);
                                          return next;
                                        });
                                      }}
                                      className="rounded border-zinc-300"
                                    />
                                    <span className="text-sm text-zinc-800">Variant {v.index}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {showPlatformLaunchControls ? (
                  <>
                    <button
                      type="button"
                      onClick={handleLaunchLive}
                      disabled={launching || launchableSelectedCount === 0}
                      className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {launching ? "Launching…" : "Launch (live)"}
                    </button>
                    <button
                      type="button"
                      onClick={handleLaunchDryRun}
                      disabled={launching || launchableSelectedCount === 0}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {launching ? "Launching…" : "Launch as dry run (no spend)"}
                    </button>
                  </>
                ) : experiment.platform === "linkedin" ? (
                  <p className="text-sm text-zinc-600">
                    Select an ad account, Company Page id, and https landing URL to enable launch.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => launch(false)}
                    disabled={launching || variants.length === 0}
                    className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {launching ? "Launching…" : "Launch campaign"}
                  </button>
                )}
                {launchError && (
                  <p className="w-full basis-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {launchError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Manager: metrics + adjustments — shown when launched */}
      {experiment.status === "launched" && (
        <>
          <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Campaign performance</h2>
            {metricsLoading ? (
              <p className="text-sm text-zinc-500">Loading metrics…</p>
            ) : metrics ? (
              <>
                <p className="mb-4 text-xs text-zinc-500">
                  {metrics.source === "meta"
                    ? `Metrics from Meta${metrics.datePreset ? ` (${metrics.datePreset})` : ""}. All values match what Meta tracks.`
                    : experiment.platform === "linkedin"
                      ? "LinkedIn reporting is not wired into this app yet — use LinkedIn Campaign Manager. Values below are placeholders."
                      : experiment.platform === "tiktok" && experiment.tiktokCampaignId
                        ? "TikTok reporting via API is not wired yet — use TikTok Ads Manager for spend and delivery. Values below are placeholders."
                        : experiment.platform === "google" && experiment.googleCampaignId
                          ? "Google Ads metrics are not pulled into this app yet — use Google Ads for delivery, spend, and approvals. Values below are placeholders."
                          : "Connect the ad platform and launch to see live data. Values below are placeholders."}
                </p>
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-zinc-700">Spend &amp; reach</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Spend</p>
                      <p className="text-lg font-semibold text-zinc-900">${metrics.spend.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Impressions</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.impressions.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Reach</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.reach.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Frequency</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.frequency.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">CPM</p>
                      <p className="text-lg font-semibold text-zinc-900">${metrics.cpm.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-zinc-700">Clicks &amp; engagement</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Clicks</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.clicks.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Link clicks</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.linkClicks.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">CTR</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.ctr.toFixed(2)}%</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">CPC</p>
                      <p className="text-lg font-semibold text-zinc-900">${metrics.cpc.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Conversions</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.conversions.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Cost per conversion</p>
                      <p className="text-lg font-semibold text-zinc-900">${metrics.costPerConversion.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Metrics unavailable.</p>
            )}
          </section>

          <section className="mt-4 rounded-xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-zinc-900">AI optimization (all platforms)</h2>
            <p className="mb-4 text-sm text-zinc-600">
              Choose how the assistant uses performance data. <strong>Meta</strong> campaigns can use live metrics from this app;
              <strong> Google Ads</strong>, <strong>TikTok</strong>, and <strong>LinkedIn</strong> use the same AI review with placeholder metrics until native reporting is connected — the AI will still tailor advice to each platform.{" "}
              <strong>Auto</strong> can update the <strong>Meta ad set daily budget</strong> only (±25% clamp) when you run a review and the model recommends a budget; other platforms’ budgets stay manual in their own UIs.
            </p>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600">Optimization mode</label>
                <select
                  value={optimizationModeDraft}
                  onChange={(e) => setOptimizationModeDraft(e.target.value as AiOptimizationMode)}
                  className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                >
                  <option value="off">Off — no budget automation</option>
                  <option value="suggestions">Suggestions — AI advice only</option>
                  <option value="auto">Auto — apply Meta budget when AI recommends (Meta only)</option>
                </select>
              </div>
              <button
                type="button"
                onClick={saveOptimizationMode}
                disabled={
                  savingOptimizationMode ||
                  optimizationModeDraft === (experiment.aiOptimizationMode ?? "off")
                }
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-50"
              >
                {savingOptimizationMode ? "Saving…" : "Save mode"}
              </button>
            </div>
            <div className="border-t border-violet-200 pt-4">
              <button
                type="button"
                onClick={runAiPerformanceReview}
                disabled={insightsLoading}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {insightsLoading ? "Analyzing…" : "Run AI performance review"}
              </button>
              {insightsError && <p className="mt-2 text-sm text-red-600">{insightsError}</p>}
              {insightsResult && (
                <div className="mt-4 space-y-3 rounded-lg border border-violet-200 bg-white p-4 text-sm text-zinc-800">
                  <p className="text-xs text-zinc-500">
                    Data source: {insightsResult.metricsSource} · Platform: {insightsResult.platform}
                  </p>
                  <p className="font-medium text-zinc-900">{insightsResult.summary}</p>
                  <ul className="list-inside list-disc space-y-1 text-zinc-700">
                    {insightsResult.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  {insightsResult.recommendedDailyBudget != null && (
                    <p className="text-zinc-700">
                      AI suggested daily budget:{" "}
                      <span className="font-semibold">${insightsResult.recommendedDailyBudget.toFixed(2)}</span>
                      {insightsResult.budgetAutoApplied ? " (applied on Meta)" : ""}
                    </p>
                  )}
                  {insightsResult.budgetNote && (
                    <p className="rounded bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600">{insightsResult.budgetNote}</p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Campaign controls: pause/activate and budget when linked to Meta */}
          <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Campaign controls</h2>
            {experiment.metaCampaignId || experiment.metaAdSetId ? (
              <>
                <p className="mb-4 text-sm text-zinc-600">Make changes here; they apply on Meta immediately.</p>
                {experiment.metaCampaignId && (
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700">Status on Meta</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("PAUSED")}
                      disabled={statusUpdating}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {statusUpdating ? "Updating…" : "Pause campaign"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("ACTIVE")}
                      disabled={statusUpdating}
                      className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
                    >
                      {statusUpdating ? "Updating…" : "Activate campaign"}
                    </button>
                    {statusError && <p className="text-sm text-red-600">{statusError}</p>}
                  </div>
                )}
                {experiment.metaAdSetId && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="text-sm font-medium text-zinc-700">
                        {experiment.metaAdSetId?.includes(",")
                          ? "Total Meta daily budget (split across ad sets): $"
                          : "Ad set daily budget (Meta): $"}
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className="ml-1 w-20 rounded border border-zinc-300 px-2 py-1 text-zinc-900"
                          value={budgetValue}
                          onChange={(e) => setBudgetValue(e.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleUpdateBudget}
                        disabled={budgetUpdating}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {budgetUpdating ? "Saving…" : "Update budget"}
                      </button>
                      {budgetError && <p className="text-sm text-red-600">{budgetError}</p>}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {experiment.metaAdSetId?.includes(",")
                        ? `Total $${budgetValue}/day is split evenly across ${experiment.metaAdSetId.split(",").filter(Boolean).length} ad sets (one per variant).`
                        : `One ad set daily cap; Meta splits delivery between creatives in that ad set.`}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-500">Link this campaign to Meta (launch to Meta) to pause, activate, or change budget from here.</p>
            )}
          </section>
        </>
      )}

        {experiment.prompt && (
          <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-700">Ad idea / prompt</p>
            <p className="mt-1 text-sm text-zinc-600">{experiment.prompt}</p>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-zinc-900">Creative direction for images</h2>
          <p className="mb-3 text-sm text-zinc-600">
            This prompt guides how the ad images look when you generate or redesign creatives. Edit and save, then use &quot;Redesign creatives&quot; below to apply to all or selected variants.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <textarea
              className="min-h-[72px] w-full max-w-xl rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={creativePromptInput}
              onChange={(e) => setCreativePromptInput(e.target.value)}
              placeholder="e.g. Clean product shot, minimal background, bright lighting"
            />
            <button
              type="button"
              onClick={saveCreativePrompt}
              disabled={savingCreativePrompt || creativePromptInput === (experiment.creativePrompt ?? "")}
              className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 disabled:opacity-50"
            >
              {savingCreativePrompt ? "Saving…" : "Save"}
            </button>
          </div>
        </section>

        {experiment.platform === "meta" && (
          <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-zinc-900">Target audience (Meta)</h2>
            <p className="mb-3 text-sm text-zinc-600">
              Describe who should see this campaign in plain English. AI turns it into Meta ad set targeting
              (countries, age range, gender). Save before launch. Use &quot;Preview&quot; to see the JSON
              Meta will receive. Detailed interests and job titles are not included yet—only location, age, and
              gender.
            </p>
            <div className="flex flex-col gap-3">
              <textarea
                className="min-h-[88px] w-full max-w-2xl rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={targetAudienceInput}
                onChange={(e) => setTargetAudienceInput(e.target.value)}
                placeholder="e.g. Women 35–55 in Texas and Florida interested in home wellness; US English speakers."
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={saveTargetAudience}
                  disabled={savingTargetAudience || targetAudienceInput === (experiment.targetAudiencePrompt ?? "")}
                  className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 disabled:opacity-50"
                >
                  {savingTargetAudience ? "Saving…" : "Save audience"}
                </button>
                <button
                  type="button"
                  onClick={previewTargetAudience}
                  disabled={previewLoading || !targetAudienceInput.trim()}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {previewLoading ? "Generating…" : "Preview Meta targeting"}
                </button>
              </div>
              {previewError && (
                <p className="text-sm text-red-600">{previewError}</p>
              )}
              {targetPreview && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-800">
                  <p className="mb-1 font-medium text-zinc-700">Resolved targeting (at preview time)</p>
                  <pre className="whitespace-pre-wrap break-all font-mono text-[11px]">{JSON.stringify(targetPreview, null, 2)}</pre>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900">Ad variants</h2>
          <p className="mb-4 text-sm text-zinc-600">
            {experiment.creativesSource === "own"
              ? "Paste your ad copy for each variant and click Save. Attach images from your library or upload new ones below each preview (draft only). When ready, click Launch campaign."
              : "Review and edit copy below. Use “Regenerate with AI” for new copy or “Regenerate creative” to change the image. Drag the handle to reorder variants; drag a creative onto another to swap images. On drafts you can also attach a library image or upload a file per variant. When ready, click Launch campaign."}
          </p>

          {sortedVariants.length === 0 ? (
            <p className="text-zinc-500">No variants yet. Create this campaign again from the new campaign flow.</p>
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
                <p className="mb-3 text-sm font-medium text-zinc-700">Redesign creatives</p>
                <p className="mb-3 text-xs text-zinc-600">
                  Use the creative direction above. Select variants to regenerate their images, then click Redesign selected or Redesign all.
                </p>
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {sortedVariants.map((v) => (
                    <label key={v.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={variantsSelectedForRedesign.has(v.id)}
                        onChange={(e) => {
                          setVariantsSelectedForRedesign((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(v.id);
                            else next.delete(v.id);
                            return next;
                          });
                        }}
                        disabled={redesigningVariantIds.size > 0}
                        className="rounded border-zinc-300"
                      />
                      <span className="text-sm text-zinc-800">Variant {v.index}</span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => redesignCreatives(Array.from(variantsSelectedForRedesign))}
                    disabled={variantsSelectedForRedesign.size === 0 || redesigningVariantIds.size > 0}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Redesign selected
                  </button>
                  <button
                    type="button"
                    onClick={() => redesignCreatives(sortedVariants.map((v) => v.id))}
                    disabled={redesigningVariantIds.size > 0}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Redesign all
                  </button>
                  {redesigningVariantIds.size > 0 && (
                    <span className="text-sm text-zinc-500">
                      Regenerating {sortedVariants.length - redesigningVariantIds.size} of {sortedVariants.length}…
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedVariants.map((v) => (
              <div
                key={v.id}
                data-variant-id={v.id}
                className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm ${
                  draggedVariantId === v.id ? "border-blue-400 opacity-80" : "border-zinc-200"
                } ${reordering ? "pointer-events-none" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.setAttribute("data-drop-target", "true");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.removeAttribute("data-drop-target");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.removeAttribute("data-drop-target");
                  const raw = e.dataTransfer.getData("text/plain");
                  if (raw.startsWith(CREATIVE_SWAP_PREFIX)) return;
                  const draggedId = raw;
                  if (draggedId && draggedId !== v.id) handleVariantReorder(draggedId, v.id);
                }}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      draggable
                      onDragStart={(e) => {
                        setDraggedVariantId(v.id);
                        e.dataTransfer.setData("text/plain", v.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDraggedVariantId(null)}
                      className="cursor-grab touch-none rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing"
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="5" r="1" />
                        <circle cx="9" cy="12" r="1" />
                        <circle cx="9" cy="19" r="1" />
                        <circle cx="15" cy="5" r="1" />
                        <circle cx="15" cy="12" r="1" />
                        <circle cx="15" cy="19" r="1" />
                      </svg>
                    </span>
                    <span className="font-medium text-zinc-800">
                      Variant {v.index}
                      {isAdmin && v.aiSource && (
                        <span
                          className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
                          title="Which AI generated this variant"
                        >
                          {v.aiSource === "openai" ? "OpenAI" : "Anthropic"}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {savedVariantId === v.id && (
                      <span className="text-xs text-green-600">Saved</span>
                    )}
                    {experiment.creativesSource === "ai" && (
                      <button
                        type="button"
                        onClick={() => regenerateVariant(v)}
                        disabled={regeneratingVariantId === v.id}
                        className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200 disabled:opacity-50"
                      >
                        {regeneratingVariantId === v.id ? "…" : "Regenerate"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => saveVariant(v)}
                      disabled={savingVariantId === v.id || (variantCopies[v.id] ?? v.copy) === v.copy}
                      className="rounded bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-300 disabled:opacity-50"
                    >
                      {savingVariantId === v.id ? "…" : "Save"}
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-zinc-500">Ad preview</p>
                    {(v.hasCreative || creativeUrls[v.id]) && (
                      <button
                        type="button"
                        onClick={() => generateCreative(v)}
                        disabled={generatingCreativeId === v.id || redesigningVariantIds.has(v.id)}
                        className="rounded bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-200 disabled:opacity-50"
                      >
                        {generatingCreativeId === v.id || redesigningVariantIds.has(v.id) ? "Regenerating…" : "Regenerate creative"}
                      </button>
                    )}
                    {isDraft && !(v.hasCreative || creativeUrls[v.id]) && (
                      <button
                        type="button"
                        onClick={() => generateCreative(v)}
                        disabled={generatingCreativeId === v.id || redesigningVariantIds.has(v.id)}
                        className="rounded bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-200 disabled:opacity-50"
                      >
                        {generatingCreativeId === v.id ? "Generating…" : "Generate AI image"}
                      </button>
                    )}
                  </div>
                  <div
                    className={`rounded-lg border transition-colors ${
                      draggedCreativeVariantId === v.id ? "border-blue-400 bg-blue-50/50" : "border-transparent"
                    } ${
                      draggedCreativeVariantId && draggedCreativeVariantId !== v.id ? "border-dashed border-zinc-300 bg-zinc-50/50" : ""
                    } ${(v.hasCreative || creativeUrls[v.id]) ? "cursor-grab active:cursor-grabbing" : ""}`}
                    draggable={!!(v.hasCreative || creativeUrls[v.id]) && !swapCreativesLoading}
                    onDragStart={(e) => {
                      if (!(v.hasCreative || creativeUrls[v.id])) return;
                      setDraggedCreativeVariantId(v.id);
                      // text/plain works reliably cross-browser; custom MIME types often fail on drop/getData
                      e.dataTransfer.setData("text/plain", `${CREATIVE_SWAP_PREFIX}${v.id}`);
                      e.dataTransfer.effectAllowed = "move";
                      try {
                        e.dataTransfer.setDragImage(e.currentTarget, 10, 10);
                      } catch {
                        /* ignore */
                      }
                    }}
                    onDragEnd={() => setDraggedCreativeVariantId(null)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.types.includes("text/plain")) {
                        e.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const raw = e.dataTransfer.getData("text/plain");
                      const sourceId = raw.startsWith(CREATIVE_SWAP_PREFIX) ? raw.slice(CREATIVE_SWAP_PREFIX.length) : "";
                      if (!sourceId || sourceId === v.id) return;
                      handleSwapCreatives(sourceId, v.id);
                    }}
                  >
                    <AdPreview
                      copy={variantCopies[v.id] ?? v.copy}
                      platform={experiment.platform}
                      imageUrl={creativeUrls[v.id] ?? null}
                      imageDraggable={false}
                    />
                  </div>
                  {(v.hasCreative || creativeUrls[v.id]) && (
                    <p className="mt-1 text-[10px] text-zinc-400">Drag creative onto another variant to swap</p>
                  )}
                  {isDraft && (
                    <div className="mt-3 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-2">
                      <p className="text-[11px] font-medium text-zinc-600">Attach creative</p>
                      <div className="flex flex-wrap items-stretch gap-2">
                        <select
                          value={libraryPick[v.id] ?? ""}
                          onChange={(e) =>
                            setLibraryPick((p) => ({ ...p, [v.id]: e.target.value }))
                          }
                          disabled={settingCreativeVariantId === v.id || libraryCreatives.length === 0}
                          className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 disabled:opacity-60"
                        >
                          <option value="">
                            {libraryCreatives.length === 0 ? "No library images yet" : "Choose from library…"}
                          </option>
                          {libraryCreatives.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={
                            !libraryPick[v.id] ||
                            settingCreativeVariantId === v.id ||
                            libraryCreatives.length === 0
                          }
                          onClick={() =>
                            libraryPick[v.id] &&
                            applyLibraryCreativeToVariant(v.id, libraryPick[v.id])
                          }
                          className="shrink-0 rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
                        >
                          {settingCreativeVariantId === v.id ? "…" : "Use library"}
                        </button>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => {
                            variantFileInputsRef.current[v.id] = el;
                          }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) void applyUploadCreativeToVariant(v.id, file);
                          }}
                        />
                        <button
                          type="button"
                          disabled={settingCreativeVariantId === v.id}
                          onClick={() => variantFileInputsRef.current[v.id]?.click()}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
                        >
                          Upload image file
                        </button>
                      </div>
                      {attachCreativeErrors[v.id] && (
                        <p className="text-xs text-red-600">{attachCreativeErrors[v.id]}</p>
                      )}
                    </div>
                  )}
                </div>
                <textarea
                  className="min-h-[80px] w-full resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={variantCopies[v.id] ?? v.copy}
                  onChange={(e) =>
                    setVariantCopies((prev) => ({ ...prev, [v.id]: e.target.value }))
                  }
                  placeholder={experiment.creativesSource === "own" ? "Paste your ad copy here..." : "Ad copy..."}
                />
              </div>
            ))}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
