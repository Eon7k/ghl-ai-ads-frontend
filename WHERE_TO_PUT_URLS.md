# Where to put your URLs

Use **your actual** backend and frontend URLs. Below, replace:

- **YOUR-BACKEND** = your Render backend URL (e.g. `ghl-ai-backend.onrender.com` → full URL `https://ghl-ai-backend.onrender.com`)
- **YOUR-FRONTEND** = where users open the app (e.g. `https://k-6marketing.com` or `https://your-project.vercel.app` — **no trailing slash**)

---

## 1. Meta (Facebook) — Redirect URI

**Where:** [developers.facebook.com](https://developers.facebook.com) → Your app → **Facebook Login** → **Settings** → **Valid OAuth Redirect URIs**

**Add this exact line:**

```
https://YOUR-BACKEND/integrations/meta/callback
```

**Example (if your backend is ghl-ai-backend.onrender.com):**

```
https://ghl-ai-backend.onrender.com/integrations/meta/callback
```

---

## 2. TikTok — Redirect URI

**Where:** TikTok for Business / Marketing API app settings → **Redirect URI** (or OAuth / Authorized redirect URIs)

**Add this exact line:**

```
https://YOUR-BACKEND/integrations/tiktok/callback
```

**Example:**

```
https://ghl-ai-backend.onrender.com/integrations/tiktok/callback
```

---

## 3. Render (backend) — Environment variables

**Where:** [Render](https://render.com) → Your **backend** service → **Environment**

| Key | Value |
|-----|--------|
| `BACKEND_URL` | `https://YOUR-BACKEND` (no slash at end) |
| `FRONTEND_URL` | `https://YOUR-FRONTEND` (no slash at end; e.g. `https://k-6marketing.com`) |
| `META_APP_ID` | (your Meta app ID) |
| `META_APP_SECRET` | (your Meta app secret) |
| `TIKTOK_APP_ID` | (your TikTok app ID) |
| `TIKTOK_APP_SECRET` | (your TikTok app secret) |
| `JWT_SECRET` | (your secret; you already have this) |
| `PORT` | `4000` (or leave unset) |
| `OPENAI_API_KEY` | (if you use OpenAI) |

**Example (if backend is ghl-ai-backend.onrender.com, frontend is k-6marketing.com):**

- `BACKEND_URL` = `https://ghl-ai-backend.onrender.com`
- `FRONTEND_URL` = `https://k-6marketing.com`

---

## 4. Vercel (frontend) — Environment variables

**Where:** [Vercel](https://vercel.com) → Your **frontend** project → **Settings** → **Environment Variables**

| Key | Value |
|-----|--------|
| `BACKEND_URL` | `https://YOUR-BACKEND` (no slash at end) — used by the API proxy |
| `NEXT_PUBLIC_BACKEND_URL` or `NEXT_PUBLIC_API_URL` | `https://YOUR-BACKEND` (same) — used by Integrations “Connect Meta” / “Connect TikTok” in the browser |

**Example:**

- `BACKEND_URL` = `https://ghl-ai-backend.onrender.com`
- `NEXT_PUBLIC_BACKEND_URL` = `https://ghl-ai-backend.onrender.com`

After adding or changing these, **redeploy** the frontend so the new values are used.

---

## 5. Local development (optional)

**Backend `.env` (ghl-ai-backend):**

- `PORT=4000`
- `FRONTEND_URL=http://localhost:3000`
- `META_APP_ID`, `META_APP_SECRET`, `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET` if you test connect locally

**Frontend `.env.local` (ghl-ai/frontend):**

- `BACKEND_URL=http://localhost:4000`
- `NEXT_PUBLIC_BACKEND_URL=http://localhost:4000`

**Meta redirect URI for local:** add `http://localhost:4000/integrations/meta/callback` in the Meta app (if testing Meta connect locally).

**TikTok redirect URI for local:** add `http://localhost:4000/integrations/tiktok/callback` in the TikTok app (if testing TikTok connect locally).

---

## Quick reference (your likely values)

If your backend is **ghl-ai-backend.onrender.com** and your live site is **k-6marketing.com**:

| What | Where it goes | Value |
|------|----------------|-------|
| Meta redirect URI | Meta app → Facebook Login → Valid OAuth Redirect URIs | `https://ghl-ai-backend.onrender.com/integrations/meta/callback` |
| TikTok redirect URI | TikTok app → Redirect URI | `https://ghl-ai-backend.onrender.com/integrations/tiktok/callback` |
| Render `BACKEND_URL` | Render → backend → Environment | `https://ghl-ai-backend.onrender.com` |
| Render `FRONTEND_URL` | Render → backend → Environment | `https://k-6marketing.com` |
| Vercel `BACKEND_URL` | Vercel → frontend → Environment Variables | `https://ghl-ai-backend.onrender.com` |
| Vercel `NEXT_PUBLIC_BACKEND_URL` | Vercel → frontend → Environment Variables | `https://ghl-ai-backend.onrender.com` |

Replace `ghl-ai-backend.onrender.com` with your real Render URL and `k-6marketing.com` with your real frontend URL if they’re different.
