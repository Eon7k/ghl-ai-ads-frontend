# What to build next — checklist

Live is working. Here’s what’s left, in order.

---

## Phase 2 — Budget split + creatives (do this next)

| # | What | Where |
|---|------|--------|
| 1 | **Show budget per variant** | Experiment detail + experiments list: show “$X/day per variant” (equal split: total ÷ N). |
| 2 | **Creatives source choice** | New experiment form: “Creatives: AI-generated \| I’ll use my own.” Send to backend; backend uses it when generating or leaves copy blank for “own.” |
| 3 | **Paste own copy per variant** | Experiment detail: when “I’ll use my own,” show a paste area per variant (pre-fill or replace AI copy). Save via existing PATCH variant. |
| 4 | **(Later) Upload images** | Per-variant image upload when “own creatives”; backend stores URL or file ref. |

---

## Phase 3 — Performance + optimization (after Phase 2)

| # | What | Where |
|---|------|--------|
| 5 | **Ad platform connections** | Backend (or separate service): Meta/Google/TikTok APIs to pull spend, impressions, clicks, conversions per ad. |
| 6 | **Performance dashboard** | Experiment detail: table or cards with per-variant metrics (spend, impressions, clicks, conversions). |
| 7 | **Recommendations** | Backend logic: suggest “Increase budget for variant X, decrease for Y.” Frontend: show a “Recommendations” section. |
| 8 | **Auto-optimization toggle** | Setting per experiment: “Automatically shift budget to better performers” with optional cap (e.g. no variant &gt; 50% of budget). |

---

## Phase 4 — Polish (when ready)

| # | What | Where |
|---|------|--------|
| 9 | **Custom domain** | Vercel: add k-6marketing.com to this project; point DNS. |
| 10 | **GHL auth/wiring** | If needed: pass user/contact from GHL into the app. |
| 11 | **More platforms / rules** | Extra ad platforms; custom budget split rules; safety limits. |

---

**Next step:** Implement Phase 2 items 1–3 (budget per variant, creatives choice, paste own copy).
