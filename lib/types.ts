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
  variants?: AdVariant[];
};

export type CreateExperimentBody = {
  name: string;
  platform: string;
  totalDailyBudget: number;
  prompt: string;
  variantCount: number;
  creativesSource?: CreativesSource;
};

export type UpdateVariantBody = {
  copy: string;
};
