# Deploy steps (use every time)

Use this checklist whenever you want to deploy. The assistant will give you the **commit message** to use each time.

---

## 1. Commit message (copy from assistant)

When you’re ready to deploy, ask the assistant for “the deploy commit message” or “deploy steps.” They will give you something like:

- **Frontend:** `Add optional creative prompt for AI images`
- **Backend:** `Store creativePrompt, use in generate-creative`

Copy those into the commands below where it says `COMMIT_MSG`.

---

## 2. Commands (run in Terminal)

### Frontend

```bash
cd /Users/argylecryo/Documents/ghl-ai/frontend
git add .
git status
git commit -m "COMMIT_MSG"
git push
```

### Backend

```bash
cd /Users/argylecryo/Documents/ghl-ai-backend
git add .
git status
git commit -m "COMMIT_MSG"
git push
```

Replace `COMMIT_MSG` each time with the message the assistant gave you for that repo.

---

## 3. Your links (fill in once, then reuse)

Add your real URLs here so you have them in one place:

| What | URL |
|------|-----|
| **Frontend app (live)** | https://your-app.vercel.app *(or your real URL)* |
| **Backend API (live)** | https://your-backend.onrender.com *(or your real URL)* |
| **Vercel dashboard** | https://vercel.com/dashboard |
| **Render dashboard** | https://dashboard.render.com |
| **GitHub – frontend repo** | https://github.com/YOUR_USERNAME/ghl-ai *(or your repo)* |
| **GitHub – backend repo** | https://github.com/YOUR_USERNAME/ghl-ai-backend *(or your repo)* |

---

## 4. After you push

- Frontend (Vercel) and backend (Render) will redeploy automatically.
- Wait a few minutes, then test on your **live** URLs above.
- Only add or change env vars in Vercel/Render when you add a new feature that needs them (e.g. a new API key).
