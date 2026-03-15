/**
 * API client for the backend. All requests go through the same-origin proxy
 * so the app works in the GHL iframe without CORS issues.
 */

const API_BASE = "/api/proxy";

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = "GET", body } = options;
  const url = `${API_BASE}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
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

export const api = {
  /** List all experiments */
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

  /** Mark experiment as launched */
  launchExperiment: (id: string) =>
    request<import("./types").Experiment>(`experiments/${id}/launch`, {
      method: "POST",
      body: {},
    }),
};
