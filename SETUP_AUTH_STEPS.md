# Setup: Auth & Accounts (step-by-step)

Do the steps in order. Copy and paste the terminal commands exactly.

**Note:** The `cd` commands below use the path `Documents/ghl-ai-backend` and `Documents/ghl-ai/frontend`. If your project is in a different folder, change that part of the path (or drag the folder into the terminal to get the path).

---

## Step 1: Add JWT secret on your computer (backend)

1. In your project, open the **backend** folder: **ghl-ai-backend**.
2. Open the file named **`.env`** (create a new file with that name if it doesn’t exist).
3. In that file, add this line (you can leave it as-is or change the part after `=` to any long random string, at least 20 characters):

```
JWT_SECRET=my-secret-key-at-least-20-characters-long
```

4. Save the file and close it.

---

## Step 2: Add JWT secret on Render (for when the app is live online)

1. Go to [Render](https://render.com) in your browser and log in.
2. Open the service that runs your **backend** (ghl-ai-backend).
3. In the left sidebar, click **Environment**.
4. Click **Add Environment Variable**.
5. Where it says **Key**, type exactly: `JWT_SECRET`
6. Where it says **Value**, paste a long random string (e.g. the same one you used in Step 1, or a new one).
7. Click **Save Changes**.
8. Wait until Render finishes redeploying (you’ll see a green “Live” or similar when it’s done).

---

## Step 3: Open a terminal and go to the backend folder

1. Open your computer’s **Terminal** (or Command Prompt).
2. Copy and paste this line, then press **Enter**:

```bash
cd /Users/argylecryo/Documents/ghl-ai-backend
```

3. You should now be “in” the backend folder. The line before your cursor will usually show something like `ghl-ai-backend`.

---

## Step 4: Install backend dependencies

1. With the terminal still in the backend folder (from Step 3), copy and paste this, then press **Enter**:

```bash
npm install
```

2. Wait for it to finish. You may see a lot of text; that’s normal. When you get your cursor back with no errors, you’re done.

---

## Step 5: Start the backend server

1. In the **same** terminal (still in the backend folder), copy and paste this, then press **Enter**:

```bash
npm run dev
```

2. Leave this terminal **open and running**. You should see a message like “Backend listening on port 4000” (or 3001). Do not close this window while you’re testing.

---

## Step 6: Open a second terminal and go to the frontend folder

1. Open a **new** terminal window (or new tab in your terminal app).
2. Copy and paste this line, then press **Enter**:

```bash
cd /Users/argylecryo/Documents/ghl-ai/frontend
```

3. You should now be “in” the frontend folder.

---

## Step 7: Start the frontend app

1. In the frontend terminal (from Step 6), copy and paste this, then press **Enter**:

```bash
npm run dev
```

2. Wait until you see something like “Ready” or “compiled successfully” and a URL.
3. In your browser, go to: **http://localhost:3000**

---

## Step 8: Test sign up and login

1. On the home page, click **Sign up**.
2. Enter any email and a password (at least 8 characters). Click **Sign up**.
3. You should be taken to the **Experiments** page. If you see that, sign up works.
4. Click **Log out** (on the page or in the Experiments list).
5. Click **Log in** and enter the same email and password. You should be back on Experiments with your data. If that works, login works too.

---

## Step 9 (optional): Production / live site

- **Backend on Render:** You already added `JWT_SECRET` in Step 2. Nothing else needed for auth.
- **Frontend on Vercel:** In Vercel → your project → **Settings** → **Environment Variables**, add:
  - **Key:** `BACKEND_URL`
  - **Value:** your Render backend URL (e.g. `https://your-app-name.onrender.com` — no slash at the end).

---

## Quick checklist

- [ ] Step 1: `.env` in **ghl-ai-backend** has the line `JWT_SECRET=...`
- [ ] Step 2: **Render** has the environment variable `JWT_SECRET`
- [ ] Step 3–5: Backend terminal — `cd` → `npm install` → `npm run dev` (leave it running)
- [ ] Step 6–7: Frontend terminal — `cd` → `npm run dev` → open http://localhost:3000
- [ ] Step 8: Signed up and logged in once to confirm it works

If something fails, look at the terminal where the backend is running for red error text, and press **F12** in the browser to open the console and check for errors there.
