# Ad Integrations: Login, Link, Launch & Manage

Step-by-step plan to let users connect their ad accounts (Meta, TikTok, Google) and launch/manage ads from inside the app.

---

## Phase 1 — Link ad accounts (OAuth)

**Goal:** User can “Connect Meta” / “Connect TikTok” / “Connect Google” so we store an access token per user per platform.

1. **Backend**
   - Store “connected accounts” per user: platform, access_token, (refresh_token if any), platform account id/name.
   - Endpoints:
     - **GET /integrations** — List connected accounts for the logged-in user.
     - **GET /integrations/meta/connect** — Start Meta OAuth (redirect to Meta; user logs in and approves; Meta redirects back to our callback).
     - **GET /integrations/meta/callback** — Meta sends user here with a code; we exchange code for token and save for the user; redirect to frontend “Integrations” page.
     - Same pattern later for TikTok and Google: `/integrations/tiktok/connect` and `/integrations/google/connect` + callbacks.
     - **DELETE /integrations/:id** — Disconnect an account (remove stored token).
   - Env: `META_APP_ID`, `META_APP_SECRET`, `FRONTEND_URL` (where to send user after connect, e.g. your Vercel URL).

2. **Frontend**
   - **Integrations** page (under auth): “Connected accounts” list; buttons “Connect Meta”, “Connect TikTok”, “Connect Google”.
   - “Connect Meta” = open backend URL that starts OAuth (we pass auth token in query so backend knows the user). After callback, user lands back on Integrations with “Meta” in the list.

3. **Meta app setup (you do once in Meta for Developers)**
   - Create an app; add “Facebook Login” product; set Valid OAuth Redirect URIs to your backend callback URL (e.g. `https://your-backend.onrender.com/integrations/meta/callback`).
   - Request permissions: `ads_management`, `ads_read`, `business_management` (as needed).

---

## Phase 2 — Launch ads to Meta (and then TikTok / Google)

**Goal:** When user clicks “Launch” on an experiment, we create a real campaign and ads on the chosen platform using the stored token.

1. **Backend**
   - When experiment is “launched” and platform is Meta: call Meta Marketing API to create Campaign → Ad Set → Ad(s) using the experiment’s variants (copy, budget split).
   - Store the platform campaign/ad IDs on the experiment so we can later “manage” (pause, update budget, etc.).
   - Same idea later for TikTok and Google Ads APIs.

2. **Frontend**
   - On Launch: if no connected account for that platform, show “Connect Meta first” (link to Integrations) instead of launching.
   - After launch, show “Launched on Meta” and link to platform or show status.

---

## Phase 3 — Manage ads (pause, budget, see performance)

**Goal:** From the app, user can pause/resume, change budget, and see performance (spend, impressions, clicks).

1. **Backend**
   - Endpoints that call platform APIs: e.g. PATCH campaign (pause/budget), GET insights. Use stored token for that user’s connected account.

2. **Frontend**
   - Experiment detail: “Pause”, “Resume”, “Update budget”; show performance table (spend, impressions, clicks, etc.) pulled from platform.

---

## What we’re building first

- **Now:** Phase 1 — Backend connected-accounts + Meta OAuth (connect + callback); frontend Integrations page with “Connect Meta” and list of connected accounts.
- **Next:** Phase 2 — Launch experiment to Meta (create campaign/ads).
- **Later:** TikTok and Google OAuth + launch; then Phase 3 (manage + performance).

---

## Setup: Meta “Connect” (step-by-step)

**1. Create a Meta app**

1. Go to [developers.facebook.com](https://developers.facebook.com) and log in.
2. Click **My Apps** → **Create App** → choose **Business**.
3. Name the app (e.g. “AI Ad Manager”) and create it.

**2. Add Facebook Login and set redirect URI**

1. In the app dashboard, click **Add Product** → **Facebook Login** → **Set Up**.
2. Choose **Web**.
3. Under **Facebook Login → Settings**, find **Valid OAuth Redirect URIs**.
4. Add your **backend** callback URL (Render URL + path):
   - `https://YOUR-BACKEND.onrender.com/integrations/meta/callback`
   - Example: `https://ghl-ai-backend.onrender.com/integrations/meta/callback`
5. Save changes.

**3. Get App ID and App Secret**

1. In the app dashboard, go to **Settings → Basic**.
2. Copy **App ID** and **App Secret** (click **Show** for the secret).

**4. Add env vars on Render (backend)**

1. Render → your backend service → **Environment**.
2. Add:
   - **Key:** `META_APP_ID` → **Value:** (your App ID)
   - **Key:** `META_APP_SECRET` → **Value:** (your App Secret)
   - **Key:** `FRONTEND_URL` → **Value:** your Vercel URL, e.g. `https://your-app.vercel.app` (no trailing slash)
   - **Key:** `BACKEND_URL` → **Value:** your Render backend URL, e.g. `https://your-backend.onrender.com` (no trailing slash)
3. Save. Redeploy if needed.

**5. Add env var on Vercel (frontend)**

1. Vercel → your frontend project → **Settings → Environment Variables**.
2. Add **NEXT_PUBLIC_BACKEND_URL** (or **NEXT_PUBLIC_API_URL**) with your **Render backend URL**, e.g. `https://your-backend.onrender.com`.
   - The “Connect Meta” button needs this so the browser can redirect to your backend to start OAuth.
3. Redeploy the frontend.

**6. Test**

1. Open your live app → **Integrations**.
2. Click **Connect Meta (Facebook & Instagram)**.
3. You should be sent to Meta to log in and approve; then sent back to Integrations with “Meta account connected”.
