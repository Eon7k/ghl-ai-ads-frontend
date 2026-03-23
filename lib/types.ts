/**
 * Shared types for the AI Ad Manager frontend.
 * These match the backend API spec (see BACKEND_API_SPEC.md).
 */

export type Platform = "meta" | "google" | "tiktok";

export type AdVariant = {
  id: string;
  experimentId: string;
  index: number;
  copy: string;
  status: string;
  hasCreative?: boolean;
  /** Which AI generated this variant (admin-only in UI). */
  aiSource?: "openai" | "anthropic";
};

export type CreativesSource = "ai" | "mix" | "own";

export type Experiment = {
  id: string;
  name: string;
  platform: string;
  status: string;
  phase: string;
  totalDailyBudget: number;
  prompt?: string;
  variantCount?: number;
  creativesSource?: CreativesSource;
  /** Which AI generated ad copy: openai, anthropic, or split. Only set when creativesSource === "ai". */
  aiProvider?: "openai" | "anthropic" | "split";
  aiCreativeCount?: number;
  /** Optional: how the user wants the ad image/creative to look (used when generating AI creatives). */
  creativePrompt?: string;
  /** Natural-language target audience; AI converts to Meta ad set geo/age/gender at launch. */
  targetAudiencePrompt?: string;
  variants?: AdVariant[];
  /** IDs of creatives from the library attached to this campaign. */
  attachedCreativeIds?: string[];
  /** Shared id when same campaign runs on multiple platforms; used to group in Campaign Manager. */
  campaignGroupId?: string;
  metaCampaignId?: string;
  metaAdSetId?: string;
  /** Set after launch to TikTok Marketing API. */
  tiktokCampaignId?: string;
  tiktokAdGroupId?: string;
}

export type Creative = {
  id: string;
  name: string;
  createdAt: string;
};

export type CreateExperimentBody = {
  name: string;
  /** Single platform (used if platforms not provided). */
  platform: string;
  /** Optional: run same campaign on multiple platforms; one experiment created per platform. */
  platforms?: ("meta" | "google" | "tiktok")[];
  totalDailyBudget: number;
  prompt: string;
  variantCount: number;
  creativesSource?: CreativesSource;
  aiProvider?: "openai" | "anthropic" | "split";
  creativePrompt?: string;
  /** IDs of creatives from library to attach to this campaign (when using own or mixed). */
  attachedCreativeIds?: string[];
  /**
   * When creativesSource is "mix", number of variants (from the start, by index) that will get AI-generated
   * creatives from the client; remaining variants receive library images on the server.
   */
  mixAiCreativeVariantCount?: number;
};

export type UpdateVariantBody = {
  copy: string;
};
