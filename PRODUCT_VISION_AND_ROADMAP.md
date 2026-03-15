# AI Ad Manager — What We Have & What We’re Building

## What we have so far

### Frontend (Next.js on Vercel)
- **Home page** — “AI Ads Optimizer” with links to Experiments and Backend check
- **Experiments list** (`/experiments`) — Lists all experiments (name, platform, status, phase, daily budget)
- **New experiment** (`/experiments/new`) — Form to create an experiment with:
  - Name (e.g. “Dental Implant Offer Test”)
  - Platform: Meta, Google Ads, or TikTok
  - Total daily budget ($)
- **Backend connection check** (`/backend-check`) — Diagnoses 502s and confirms Vercel can reach Render
- **GHL integration** — App loads inside GoHighLevel iframe; uses Vercel URL for now (custom domain can be reconnected later)
- **API proxy** (`/api/proxy`) — Forwards requests to your Render backend so the browser only talks to your domain (avoids CORS in the iframe)

### Backend (on Render)
- **Experiments API** — Backend stores and returns experiments (GET list, POST create). Each experiment has: id, name, platform, status, phase, totalDailyBudget.

### Config
- **BACKEND_URL** set in Vercel pointing to your Render backend
- **.env.example** and README note how to set this up

---

## What you want the product to do (full vision)

1. **Prompt-driven ad variants**
   - User enters a **prompt** (idea/angle for the campaign).
   - User chooses **how many ad versions** to create (e.g. 5).
   - System generates that many **different ad variants** from the same prompt.

2. **Budget allocation**
   - User sets a **total ad budget** (e.g. $100/day).
   - System **splits that budget** across the N ad variants (e.g. equal split or by rule).
   - All of this stays within one “experiment” or “campaign” tied to that prompt/idea.

3. **Performance monitoring**
   - Track performance of each ad (impressions, clicks, conversions, spend, etc.).
   - Show this in the app so you can see which variants are doing better.

4. **Budget optimization**
   - **Recommend** how to shift budget (e.g. “Put more in Ad #3, less in Ad #1”).
   - **Optional auto-optimization**: Within the total budget, automatically move money toward better-performing ads (with limits/safety you define).

5. **Creatives**
   - **AI-generated creatives** — Option to have the system generate ad copy (and possibly images) from the prompt.
   - **Your own creatives** — Option to upload or paste your own copy/images.
   - **Choice per experiment/campaign** — You decide: “Use AI creatives” or “I’ll provide my own.”

6. **Edit before launch**
   - Every ad copy (and creative if applicable) is **editable** before anything goes live.
   - No ad is pushed to the platform until you’re happy with the final text (and creative).

---

## What we still need to do (roadmap)

### Phase 1 — Core experiment + variants + edit-before-launch ✅ DONE
- [x] **Prompt + number of variants** — New experiment form has prompt + “Number of ad variants” (1–20).
- [x] **Ad variants in the data model** — Backend has variants (id, experimentId, index, copy, status).
- [x] **Generate variants from prompt** — Backend generates N ad copies from prompt (AI or placeholder).
- [x] **Edit-all flow** — Experiment detail page lists variants with editable copy; Save per variant.
- [x] **Launch only when approved** — “Launch experiment” marks status; no ad platform push yet.

### Phase 2 — Budget split + creatives choice (NEXT)
- [ ] **Budget split** — Split total daily budget across N variants (e.g. equal). Show “$X per variant” in the UI; optionally let user adjust split.
- [ ] **Creatives source choice** — When creating experiment: “Creatives: AI-generated | I’ll use my own.” If AI: generate copy (and later images). If own: paste/upload per variant.
- [ ] **Upload / paste own creatives** — UI to paste or upload copy (and later images) per variant when “own creatives” is selected.

### Phase 3 — Performance + optimization
- [ ] **Connect to ad platforms** — Meta, Google, TikTok APIs (or GHL) to pull spend and performance per ad/variant.
- [ ] **Performance dashboard** — Per experiment: show each variant’s performance (spend, impressions, clicks, conversions).
- [ ] **Recommendations** — Suggest budget shifts based on performance (“Increase variant 2 and 4, decrease 1 and 3”).
- [ ] **Optional auto-optimization** — Auto reallocate budget toward better performers within total daily budget (with caps).

### Phase 4 — Polish and scale
- [ ] **Custom domain** — Reconnect k-6marketing.com to this Vercel project.
- [ ] **GHL-specific** — Auth, contact, or CRM wiring for “who” is running the campaign in GHL.
- [ ] **More platforms / rules** — Extra ad platforms, custom split rules, safety limits for auto-optimization.

---

## Summary

- **We have:** Phase 1 done — prompt → N variants → edit copy → launch (no platform push yet). Frontend on Vercel, backend on Render, proxy, GHL embed.
- **Next:** Phase 2 (budget split + creatives choice: AI vs own, paste/upload).
- **Then:** Phase 3 (performance + recommendations + auto-optimization), Phase 4 (polish).

Use this doc as the single source of truth for “what we have” and “what we need to do.”
