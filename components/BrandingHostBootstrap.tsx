"use client";

import { useEffect } from "react";

/**
 * On load, if the current hostname matches a verified agency custom domain,
 * apply CSS variables and document title from `/api/resolve-brand`.
 */
export function BrandingHostBootstrap() {
  useEffect(() => {
    const domain = window.location.hostname;
    if (!domain || domain === "localhost") return;

    fetch(`/api/proxy/api/resolve-brand?domain=${encodeURIComponent(domain)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { branding?: Record<string, unknown> | null }) => {
        const b = data?.branding;
        if (!b || typeof b !== "object") return;
        const root = document.documentElement;
        if (typeof b.primaryColor === "string") root.style.setProperty("--brand-primary", b.primaryColor);
        if (typeof b.secondaryColor === "string") root.style.setProperty("--brand-secondary", b.secondaryColor);
        if (typeof b.accentColor === "string") root.style.setProperty("--brand-accent", b.accentColor);
        if (typeof b.brandName === "string" && b.brandName.trim()) {
          document.title = b.brandName.trim();
          root.style.setProperty("--brand-name", JSON.stringify(b.brandName.trim()));
        }
        const fav = typeof b.faviconUrl === "string" ? b.faviconUrl : null;
        if (fav) {
          let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = fav;
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return null;
}
