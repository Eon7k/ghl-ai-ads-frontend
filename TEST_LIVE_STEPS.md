# How to test the app live (Vercel + Render)

Follow these steps so the **live** site (Vercel) talks to your **live** backend (Render).

---

## Step 1: Get your Render backend URL

1. Go to **https://dashboard.render.com** and log in.
2. Open the **service** that is your backend (the one you relaunched).
3. At the top you’ll see the service URL, e.g.:
   - `https://your-service-name-xxxx.onrender.com`
4. **Copy that full URL.** Do not add a slash at the end.

If the service is still deploying, wait until status is **Live** (green) before copying the URL.

---

## Step 2: Set BACKEND_URL in Vercel

1. Go to **https://vercel.com** and log in.
2. Open the **project** that hosts your frontend (the one you use for the AI Ad Manager).
3. Click **Settings** (top).
4. In the left sidebar, click **Environment Variables**.
5. Under **Key**, type: `BACKEND_URL`
6. Under **Value**, paste your Render URL (e.g. `https://your-service-name-xxxx.onrender.com`).
7. Choose **Production** (and **Preview** if you want it for preview deployments).
8. Click **Save**.

---

## Step 3: Redeploy the frontend

Vercel only reads env vars when it builds. So after adding `BACKEND_URL` you must redeploy:

1. Stay in the same Vercel project.
2. Open the **Deployments** tab.
3. Find the **latest** deployment (top of the list).
4. Click the **three dots (⋮)** on the right of that deployment.
5. Click **Redeploy**.
6. Confirm **Redeploy**.
7. Wait until the new deployment shows **Ready** (usually 1–2 minutes).

---

## Step 4: Open the live app and test

1. In Vercel, on the **Overview** or **Deployments** tab, find your **production URL** (e.g. `https://your-project.vercel.app` or your custom domain).
2. Open that URL in your browser.
3. Click **Go to Experiments** → **+ New Experiment**.
4. Fill the form (name, platform, prompt, number of variants, budget) and click **Create experiment**.

If the backend is running on Render and `BACKEND_URL` is set correctly, you should see the experiment detail page with variants. If you get a **502** or an error message, see below.

---

## If you still get 502 or “Backend URL not set”

- **“Backend URL not set”**  
  → `BACKEND_URL` wasn’t set when that deployment was built. Add it in **Settings → Environment Variables**, then **redeploy** again (Step 3).

- **502 or “Backend unreachable”**  
  → Vercel can’t reach Render. Check:
  1. Render service status is **Live**.
  2. `BACKEND_URL` in Vercel is **exactly** the URL from Render (no typo, no trailing slash).
  3. On Render’s free tier, the service may be sleeping; wait 30–60 seconds and try again (or open the backend URL in a tab first to wake it).

- **Open the backend check page:**  
  `https://your-project.vercel.app/backend-check`  
  It will tell you if the backend is reachable or what’s wrong.
