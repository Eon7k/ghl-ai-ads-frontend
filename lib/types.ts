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
  aiCreativeCount?: number;
  variants?: AdVariant[];
  /** Set when campaign is created on Meta; used for metrics and status updates */
  metaCampaignId?: string;
  /** Set when ad set is created on Meta; used for budget updates */
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
};

export type UpdateVariantBody = {
  copy: string;
};
