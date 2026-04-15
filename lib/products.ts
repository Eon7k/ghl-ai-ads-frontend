/**
 * Expansion products (keys must match backend productEntitlements.EXPANSION_PRODUCT_KEYS).
 * enabledProductKeys from API: null = all allowed (legacy), [] = none, else allowlist.
 */

export const EXPANSION_PRODUCTS = [
  { key: "white_label", label: "White label", description: "Custom branding, logo, domain" },
  { key: "kits", label: "Vertical kits", description: "Industry template packs" },
  { key: "landing_pages", label: "Landing pages", description: "Landing page builder" },
  { key: "reports", label: "Reports", description: "Client reporting module" },
  { key: "dfy", label: "DFY", description: "Done-for-you services" },
  { key: "competitors", label: "Competitors", description: "Competitor intelligence" },
] as const;

const ALL_KEYS = new Set<string>(EXPANSION_PRODUCTS.map((p) => p.key));

export function hasExpansionProduct(
  enabledProductKeys: string[] | null | undefined,
  productKey: string
): boolean {
  if (enabledProductKeys == null) return true;
  return enabledProductKeys.includes(productKey);
}

export function isKnownProductKey(key: string): boolean {
  return ALL_KEYS.has(key);
}
