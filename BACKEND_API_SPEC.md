# Backend API Spec — AI Ad Manager

Your frontend calls the backend through the proxy at `/api/proxy`. The backend (on Render) must implement these endpoints and shapes so the app works end-to-end.

**Base URL:** Whatever you set as `BACKEND_URL` (e.g. `https://your-app.onrender.com`). The frontend sends requests to `/api/proxy/...`, and the proxy forwards them to `BACKEND_URL/...`.

---

## Data shapes

### Experiment

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID (e.g. UUID). |
| `name` | string | Experiment name (e.g. "Dental Implant Offer Test"). |
| `platform` | string | `"meta"` \| `"google"` \| `"tiktok"`. |
| `status` | string | `"draft"` (editing, not launched) or `"launched"`. |
| `phase` | string | e.g. `"setup"`, `"running"`, `"paused"` — backend can define. |
| `totalDailyBudget` | number | Total daily budget in dollars. |
| `prompt` | string | The idea/prompt used to generate ad variants (optional for old experiments). |
| `variantCount` | number | How many ad variants (optional for old experiments). |
| `creativesSource` | string | `"ai"` (generate from prompt) or `"own"` (user pastes copy per variant). Optional. |
| `variants` | AdVariant[] | List of ad variants. Optional on list endpoint; required when fetching one experiment. |

### AdVariant

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID (e.g. UUID). |
| `experimentId` | string | Parent experiment ID. |
| `index` | number | 1-based position (Variant 1, 2, 3...). |
| `copy` | string | Ad copy (headline + body or full text). Editable by the user before launch. |
| `status` | string | e.g. `"draft"` \| `"ready"` \| `"live"` — backend can define. |

---

## Endpoints

### 1. List experiments

- **Method:** `GET`
- **Path:** `/experiments`
- **Response:** `200` with body: array of **Experiment**.
  - Each experiment may or may not include `variants`; frontend can work with or without.
- **Example:** `GET /api/proxy/experiments` → backend receives `GET {BACKEND_URL}/experiments`.

---

### 2. Create experiment (with prompt and variant count)

- **Method:** `POST`
- **Path:** `/experiments`
- **Request body (JSON):**

```json
{
  "name": "Dental Implant Offer Test",
  "platform": "meta",
  "totalDailyBudget": 50,
  "prompt": "Ad angle: pain-free dental implants, same-day results, financing available.",
  "variantCount": 5,
  "creativesSource": "ai"
}
```

- **`creativesSource`** (optional): `"ai"` or `"own"`. Default `"ai"`. If `"own"`, user will paste copy per variant; backend should create `variantCount` variants with **empty or placeholder** `copy` so the user fills them in on the detail page.
- **What the backend should do:**
  1. Create an experiment with `status: "draft"` and store `creativesSource` if present.
  2. If `creativesSource` is `"own"`: create `variantCount` variants with empty or placeholder `copy` (e.g. "Paste your ad copy...").
  3. If `creativesSource` is `"ai"` (or missing): generate `variantCount` ad variants from `prompt` (e.g. call an LLM). If you don’t have AI yet, use placeholder copy like "Variant 1", "Variant 2", etc.
  4. Save each variant with `copy` and `index` (1, 2, 3...).
  5. Return the created experiment including its `variants` array.
- **Response:** `201` with body: **Experiment** (including `variants`).
- **Example:** `POST /api/proxy/experiments` with the JSON above → backend receives `POST {BACKEND_URL}/experiments` with same body.

---

### 3. Get one experiment (with variants)

- **Method:** `GET`
- **Path:** `/experiments/:id`
- **Response:** `200` with body: **Experiment** including `variants` array.  
  If experiment not found: `404`.
- **Example:** `GET /api/proxy/experiments/abc-123` → backend receives `GET {BACKEND_URL}/experiments/abc-123`.

---

### 4. Update one variant’s copy (edit before launch)

- **Method:** `PATCH`
- **Path:** `/experiments/:experimentId/variants/:variantId`
- **Request body (JSON):**

```json
{
  "copy": "New ad copy text here..."
}
```

- **Response:** `200` with body: updated **AdVariant**.  
  If not found: `404`.
- **Example:** `PATCH /api/proxy/experiments/abc-123/variants/var-456` with body `{ "copy": "..." }` → backend receives `PATCH {BACKEND_URL}/experiments/abc-123/variants/var-456`.

---

### 5. Launch experiment

- **Method:** `POST`
- **Path:** `/experiments/:id/launch`
- **Request body:** Empty or `{}`.
- **What the backend should do:** Set experiment `status` to `"launched"`. Later you can add real ad-platform push here; for now just updating status is enough.
- **Response:** `200` with body: updated **Experiment** (e.g. `status: "launched"`).  
  If not found: `404`. If already launched, you may return `400` or still return `200` with current state.
- **Example:** `POST /api/proxy/experiments/abc-123/launch` → backend receives `POST {BACKEND_URL}/experiments/abc-123/launch`.

---

## Summary table

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/experiments` | List all experiments. |
| POST | `/experiments` | Create experiment + generate N variants from prompt; return experiment with variants. |
| GET | `/experiments/:id` | Get one experiment with its variants. |
| PATCH | `/experiments/:experimentId/variants/:variantId` | Update a variant’s `copy`. |
| POST | `/experiments/:id/launch` | Mark experiment as launched. |

---

## CORS

The frontend talks to the backend only via the Vercel proxy (same origin in the browser). So the browser never calls your Render URL directly; **Vercel’s server** does. Your backend does **not** need to allow CORS for the frontend’s domain for these API calls. (You only need CORS if you ever call the backend directly from the browser.)

---

## Optional: backward compatibility

If you already have a `POST /experiments` that only accepts `name`, `platform`, `totalDailyBudget`, you can:

- Keep accepting that shape.
- If `prompt` and `variantCount` are present, generate variants and return them; otherwise return the experiment without variants or with an empty `variants` array.

The frontend will send `prompt` and `variantCount` for new experiments.
