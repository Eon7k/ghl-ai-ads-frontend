# Setup: Full guide — run app, campaigns, metrics, Meta (step-by-step)

Do the steps in order. Copy and paste the terminal commands exactly.

**Note:** The `cd` commands below use the path `Documents/ghl-ai-backend` and `Documents/ghl-ai/frontend`. If your project is in a different folder, change that part of the path (or drag the folder into the terminal to get the path).

---

## Step 1: Add backend environment file (JWT, port, optional keys)

1. In your project, open the **backend** folder: **ghl-ai-backend**.
2. Open the file named **`.env`** (create a new file with that name if it doesn’t exist).
3. In that file, add this line (you can leave it as-is or change the part after `=` to any long random string, at least 20 characters):

```
JWT_SECRET=my-secret-key-at-least-20-characters-long
```

4. Add this line so the backend runs on a known port:

```
PORT=4000
```

5. If you use **OpenAI** for ad copy and images, add this line (replace with your real key):

```
OPENAI_API_KEY=sk-your-openai-key-here
```

6. Save the file and close it.

---

## Step 2: Open a terminal and go to the backend folder

1. Open your computer’s **Terminal** (or Command Prompt).
2. Copy and paste this line, then press **Enter**:

```bash
cd /Users/argylecryo/Documents/ghl-ai-backend
```

3. You should now be “in” the backend folder. The line before your cursor will usually show something like `ghl-ai-backend`.

---

## Step 3: Install backend dependencies

1. With the terminal still in the backend folder (from Step 2), copy and paste this, then press **Enter**:

```bash
npm install
```

2. Wait for it to finish. You may see a lot of text; that’s normal. When you get your cursor back with no errors, you’re done.

---

## Step 4: Start the backend server

1. In the **same** terminal (still in the backend folder), copy and paste this, then press **Enter**:

```bash
npm run dev
```

2. Leave this terminal **open and running**. You should see a message like “Backend listening on port 4000”. Do not close this window while you’re testing.

---

## Step 5: Add frontend environment file (so the app talks to the backend)

1. In your project, open the **frontend** folder: **ghl-ai/frontend**.
2. Create or open a file named **`.env.local`** (in the frontend root, next to `package.json`).
3. In that file, add this line (use the same port as in Step 1 — 4000):

```
BACKEND_URL=http://localhost:4000
```

4. Save the file and close it.

---

## Step 6: Open a second terminal and go to the frontend folder

1. Open a **new** terminal window (or new tab in your terminal app).
2. Copy and paste this line, then press **Enter**:

```bash
cd /Users/argylecryo/Documents/ghl-ai/frontend
```

3. You should now be “in” the frontend folder.

---

## Step 7: Install frontend dependencies

1. With the terminal still in the frontend folder (from Step 6), copy and paste this, then press **Enter**:

```bash
npm install
```

2. Wait for it to finish. When you get your cursor back with no errors, you’re done.

---

## Step 8: Start the frontend app

1. In the **same** frontend terminal, copy and paste this, then press **Enter**:

```bash
npm run dev
```

2. Wait until you see something like “Ready” or “compiled successfully” and a URL.
3. In your browser, go to: **http://localhost:3000**

---

## Step 9: Test sign up and login

1. On the home page, click **Sign up**.
2. Enter any email and a password (at least 8 characters). Click **Sign up**.
3. You should be taken to the **Campaigns** page. If you see that, sign up works.
4. Click **Log out** (on the page or in the Campaigns list).
5. Click **Log in** and enter the same email and password. You should be back on Campaigns with your data. If that works, login works too.

---

## Step 10: Create a campaign

1. Make sure you’re logged in and on **Campaigns** (click **Campaigns** in the top nav if needed).
2. Click **+ New Campaign**.
3. Fill in **Campaign name** (e.g. “Test Campaign”), **Platform** (e.g. Meta), **Ad idea / prompt**, **How many ad variants**, **AI creatives %**, and **Total daily budget**.
4. Click **Create campaign**.
5. You should be taken to the campaign detail page with ad variants and previews.

---

## Step 11: Edit and launch the campaign

1. On the campaign detail page, edit the ad copy in any variant and click **Save**.
2. If you use AI creatives, you can click **Regenerate** (for copy) or **Regenerate creative** (for image) on a variant.
3. When you’re ready, click **Launch campaign**.
4. The status should change to **Launched**.

---

## Step 12: See campaign performance (metrics)

1. After launching (Step 11), a **Campaign performance** section appears at the top of the same page.
2. You’ll see **Spend**, **Impressions**, **Clicks**, **CTR**, **CPC**, **Conversions**.
3. Right now they show **0** and a message like: “Live metrics will appear here once this campaign is pushed to your connected ad account (e.g. Meta).” That’s expected until you connect Meta and the app creates the campaign on Meta.

---

## Step 13 (optional): Add JWT secret on Render (for when the app is live online)

1. Go to [Render](https://render.com) in your browser and log in.
2. Open the service that runs your **backend** (ghl-ai-backend).
3. In the left sidebar, click **Environment**.
4. Click **Add Environment Variable**.
5. Where it says **Key**, type exactly: `JWT_SECRET`
6. Where it says **Value**, paste a long random string (e.g. the same one you used in Step 1).
7. Click **Save Changes**.
8. Wait until Render finishes redeploying (you’ll see a green “Live” or similar when it’s done).

---

## Step 14 (optional): Set BACKEND_URL on Vercel (production frontend)

1. In [Vercel](https://vercel.com), open your **frontend** project.
2. Go to **Settings** → **Environment Variables**.
3. Click **Add**.
4. Where it says **Key**, type exactly: `BACKEND_URL`
5. Where it says **Value**, paste your Render backend URL (e.g. `https://your-app-name.onrender.com` — **no slash at the end**).
6. Save, then **redeploy** the frontend so the new variable is used.

---

## Step 15 (optional): Connect Meta for live metrics later

1. At [developers.facebook.com](https://developers.facebook.com), create an app (or use an existing one). In **Settings → Basic**, copy **App ID** and **App Secret**.
2. Add the **Facebook Login** product. Under **Facebook Login → Settings**, add a **Valid OAuth Redirect URI**:  
   - Local: `http://localhost:4000/integrations/meta/callback`  
   - Production: `https://YOUR-RENDER-URL.onrender.com/integrations/meta/callback`
3. In **ghl-ai-backend**, open **`.env`** and add (use your real values):

```
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
FRONTEND_URL=http://localhost:3000
```

4. Restart the backend (Ctrl+C in the backend terminal, then run `npm run dev` again).
5. In the app, go to **Integrations** and click **Connect** for Meta. Log in with Facebook and approve. The Integrations page should then show Meta as connected and list Meta ad accounts.

Real metrics (spend, impressions, etc.) will show in Campaign performance once the app is updated to create the campaign on Meta when you click **Launch campaign** and store the Meta campaign ID.

---

## Quick checklist

- [ ] Step 1: **.env** in **ghl-ai-backend** has `JWT_SECRET=...`, `PORT=4000`, and (optional) `OPENAI_API_KEY`
- [ ] Step 2–4: Backend terminal — `cd` to backend → `npm install` → `npm run dev` (leave it running)
- [ ] Step 5: **.env.local** in **ghl-ai/frontend** has `BACKEND_URL=http://localhost:4000`
- [ ] Step 6–8: Frontend terminal — `cd` to frontend → `npm install` → `npm run dev` → open http://localhost:3000
- [ ] Step 9: Signed up and logged in; landed on Campaigns
- [ ] Step 10–12: Created a campaign, edited it, launched it, saw Campaign performance (zeros until Meta is connected and campaign is created on Meta)
- [ ] Step 13 (optional): **Render** has `JWT_SECRET`
- [ ] Step 14 (optional): **Vercel** has `BACKEND_URL` and frontend was redeployed
- [ ] Step 15 (optional): Meta app + redirect URI + backend `.env` + “Connect Meta” in the app

If something fails, look at the terminal where the backend is running for red error text, and press **F12** in the browser to open the console and check for errors there.
