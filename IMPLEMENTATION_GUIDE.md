# Implementation guide — what’s done and what you need to do

This guide explains what the frontend does now and what you need to implement on the **backend** (Render) so everything works end-to-end.

---

## What the frontend does now (no backend changes required to run)

1. **New experiment** (`/experiments/new`)
   - Form: name, platform, **prompt**, **number of variants** (1–20), total daily budget.
   - On submit: `POST /api/proxy/experiments` with `name`, `platform`, `totalDailyBudget`, `prompt`, `variantCount`.
   - Then redirects to `/experiments/:id`.

2. **Experiment detail** (`/experiments/:id`)
   - Loads: `GET /api/proxy/experiments/:id`.
   - Shows experiment info and a list of **variants** with editable **copy** (textarea per variant).
   - **Save** on a variant: `PATCH /api/proxy/experiments/:experimentId/variants/:variantId` with `{ "copy": "..." }`.
   - **Launch experiment**: `POST /api/proxy/experiments/:id/launch`.

3. **Experiments list** (`/experiments`)
   - Loads: `GET /api/proxy/experiments`.
   - Each row links to `/experiments/:id` and shows status (Draft / Launched).

4. **Proxy**
   - Supports **GET**, **POST**, and **PATCH** to your backend.

So the frontend is ready. It will show errors (e.g. 404, 502, or your API error message) until the backend implements the spec below.

---

## What you need to implement on the backend (Render)

Use **BACKEND_API_SPEC.md** as the full reference. **Reference code** for both **Node (Express)** and **Python (FastAPI)** is in **`backend-examples/node/`** and **`backend-examples/python/`** — see **`backend-examples/README.md`** for how to run and plug in real AI generation.

Short version of what to implement:

| Endpoint | What to do |
|----------|-------------|
| `GET /experiments` | Return array of experiments (each with id, name, platform, status, phase, totalDailyBudget). `variants` optional. |
| `POST /experiments` | Body: name, platform, totalDailyBudget, **prompt**, **variantCount**. Create experiment with status `"draft"`. Generate **variantCount** ad variants from **prompt** (e.g. call OpenAI/Claude to get N different ad copies). Store each variant with id, experimentId, index (1..N), copy, status. Return the experiment **with** its variants. |
| `GET /experiments/:id` | Return one experiment including its **variants** array. 404 if not found. |
| `PATCH /experiments/:experimentId/variants/:variantId` | Body: `{ "copy": "..." }`. Update that variant’s copy; return the updated variant. 404 if not found. |
| `POST /experiments/:id/launch` | Set experiment status to `"launched"`. Return the updated experiment. 404 if not found. |

**Generating variants:**  
When you receive `POST /experiments` with `prompt` and `variantCount`, call your LLM with a system prompt like: “Generate N different ad copy variants for the following idea. Each should be distinct in angle or tone. Return only the ad copy, one per line or in a JSON array.” Then create one variant per generated copy, with `index` 1, 2, 3, …

**Backward compatibility:**  
If your current `POST /experiments` only has name, platform, totalDailyBudget, add optional `prompt` and `variantCount`. When they’re missing, create the experiment without variants (or with empty `variants`). When they’re present, generate and store variants as above.

---

## How to test

1. **Backend only:** Use Postman or curl to call your Render URL (e.g. `https://your-app.onrender.com/experiments`) with the bodies in BACKEND_API_SPEC.md.
2. **Frontend + backend:** Deploy the frontend (Vercel), set `BACKEND_URL` to your Render URL, then:
   - Create a new experiment (with prompt and variant count).
   - Open the experiment detail page: you should see generated variants and be able to edit copy and click Save.
   - Click Launch experiment; status should change to Launched.
   - Experiments list should show the experiment and link to its detail page.

If something doesn’t work, check the browser Network tab: the frontend calls `/api/proxy/...`; the proxy forwards to `BACKEND_URL/...`. So a 404 or 500 from the backend will appear as that status (or message) in the frontend.

---

## File reference

| File | Purpose |
|------|---------|
| **BACKEND_API_SPEC.md** | Full API contract: shapes and endpoints for the backend. |
| **lib/types.ts** | Shared TypeScript types (Experiment, AdVariant, etc.). |
| **lib/api.ts** | Frontend API client (list, create, get one, update variant, launch). |
| **app/api/proxy/[...path]/route.ts** | Proxy: GET, POST, PATCH forwarded to backend. |
| **app/experiments/page.tsx** | Experiments list. |
| **app/experiments/new/page.tsx** | New experiment form (prompt + variant count). |
| **app/experiments/[id]/page.tsx** | Experiment detail: edit variants, launch. |
