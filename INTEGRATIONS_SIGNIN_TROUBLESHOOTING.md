# Integrations sign-in not working

If **Connect** for Meta, Google, or TikTok doesn’t work or you get an error after signing in, check the following.

---

## “Failed to connect” or similar on Facebook’s page

If Facebook shows **“Failed to connect”** (or “Can’t load URL”, “Redirect URI mismatch”) before or after you log in, the **redirect URI** doesn’t match.

**Fix:**

1. **Backend env:** On Render (or wherever the backend runs), set **`BACKEND_URL`** to your **exact** public backend URL, e.g. `https://your-app.onrender.com` (no trailing slash). Redeploy.
2. **Meta app:** In [Facebook Developers](https://developers.facebook.com/) → your app → **Facebook Login** → **Settings** → **Valid OAuth Redirect URIs**, add **exactly**:
   ```
   https://your-app.onrender.com/integrations/meta/callback
   ```
   Use your real `BACKEND_URL`; no trailing slash. Save.
3. Try **Connect** again. If it still fails, double-check there are no typos and that the backend has finished redeploying with the new `BACKEND_URL`.

---

## 1. Connect button is disabled or does nothing

**Cause:** The frontend doesn’t know your backend URL.

**Fix:**

- **Local:** In the **frontend** folder, create or edit `.env.local` and add:
  ```bash
  NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
  ```
  (Use the port your backend runs on, e.g. 4000.) Restart the frontend (`npm run dev`).

- **Production (Vercel):** In Vercel → your project → **Settings** → **Environment Variables**, add:
  - **Key:** `NEXT_PUBLIC_BACKEND_URL`
  - **Value:** your backend URL, e.g. `https://your-app.onrender.com` (no trailing slash)

  Then **redeploy** the frontend (Vercel only picks up env vars at build time).

---

## 2. "Missing token" or "Invalid or expired token"

**Cause:** You’re not logged in or the session expired.

**Fix:** Log in again on the app, then click **Connect** for the integration.

---

## 3. "Meta / TikTok / Google integration is not configured"

**Cause:** The backend is missing the app credentials for that platform.

**Fix:** On **Render** (or wherever the backend runs), open your backend service → **Environment** and add the required variables.

**Meta (Facebook & Instagram):**

- `META_APP_ID` – from [Facebook Developers](https://developers.facebook.com/) → your app → Settings → Basic
- `META_APP_SECRET` – same app → Settings → Basic

**TikTok:**

- `TIKTOK_APP_ID` (or `TIKTOK_CLIENT_KEY`)
- `TIKTOK_APP_SECRET` (or `TIKTOK_CLIENT_SECRET`)

**Google:**

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Save and let the backend redeploy.

---

## 4. Redirect URI / "Invalid state" / OAuth error after signing in at Meta/Google/TikTok

**Cause:** The redirect URL the backend sends to the provider doesn’t match what’s configured in the provider’s app, or the backend/frontend URLs are wrong.

**Fix:**

**A. Backend environment (e.g. Render)**  
Set these so the backend can build the correct redirect URL and send you back to the app:

- `BACKEND_URL` = your **public** backend URL, e.g. `https://your-backend.onrender.com` (no trailing slash)
- `FRONTEND_URL` = your **public** frontend URL, e.g. `https://your-app.vercel.app` (no trailing slash)

**B. Provider app configuration**  
In the provider’s developer console, set the **exact** redirect/callback URL the backend uses:

- **Meta:** [Facebook Developers](https://developers.facebook.com/) → your app → **Facebook Login** → **Settings** → **Valid OAuth Redirect URIs**  
  Add: `https://your-backend.onrender.com/integrations/meta/callback`  
  (Replace with your real `BACKEND_URL`.)

- **Google:** [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth client → **Authorized redirect URIs**  
  Add: `https://your-backend.onrender.com/integrations/google/callback`

- **TikTok:** TikTok for Developers → your app → **Redirect URI**  
  Add: `https://your-backend.onrender.com/integrations/tiktok/callback`

No trailing slash; use `https` in production.

**C. Try again**  
Log in to your app again and click **Connect** once the above are saved and the backend has redeployed.

---

## 5. Running locally

- Backend: `.env` should include `BACKEND_URL=http://localhost:4000` (or your backend port) and `FRONTEND_URL=http://localhost:3000` (or your frontend port).
- In the **Meta** (and Google/TikTok) app, add the **local** callback URL, e.g. `http://localhost:4000/integrations/meta/callback`, if you want to test Connect locally.

---

## Quick checklist

- [ ] Logged in to the app
- [ ] Frontend: `NEXT_PUBLIC_BACKEND_URL` set (and redeployed on Vercel if production)
- [ ] Backend: `BACKEND_URL` and `FRONTEND_URL` set to public URLs in production
- [ ] Backend: `META_APP_ID` and `META_APP_SECRET` (or TikTok/Google equivalents) set
- [ ] Meta/Google/TikTok app: redirect URI matches `BACKEND_URL/integrations/<platform>/callback` exactly
