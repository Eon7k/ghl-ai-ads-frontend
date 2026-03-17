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

export type CreativesSource = "ai" | "own";

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
  variants?: AdVariant[];
  metaCampaignId?: string;
  metaAdSetId?: string;
};

export type CreateExperimentBody = {
  name: string;
  platform: string;
  totalDailyBudget: number;
  prompt: string;
  variantCount: number;
  creativesSource?: CreativesSource;
  /** "openai" | "anthropic" | "split" — split = half OpenAI, half Anthropic */
  aiProvider?: "openai" | "anthropic" | "split";
  /** Optional: describe how you want the ad image/creative to look (used for AI-generated creatives). */
  creativePrompt?: string;
};

export type UpdateVariantBody = {
  copy: string;
};
