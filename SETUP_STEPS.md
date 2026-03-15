# Exact setup steps (using Cursor terminal)

Do these in order. Every command is meant to be run in Cursor’s terminal.

---

## Part 1: Open the terminal in Cursor

1. In Cursor, at the **top menu**, click **Terminal**.
2. Click **New Terminal**.
3. A terminal panel opens at the **bottom** of the window. The cursor will be at a line that looks like:
   ```bash
   argylecryo@MacBookPro frontend %
   ```
   The word `frontend` means you’re already in your project folder. If you see something else (e.g. `~` or `ghl-ai`), that’s okay — we’ll use the full path in the next step.

---

## Part 2: Start the Node backend

**Step 1 — Go to the Node example folder**

In the terminal, type this and press **Enter**:

```bash
cd /Users/argylecryo/Documents/ghl-ai/frontend/backend-examples/node
```

**Step 2 — Install dependencies**

Type and press **Enter**:

```bash
npm install
```

Wait until it finishes (no errors). You might see a lot of lines; that’s normal.

**Step 3 — Start the backend server**

Type and press **Enter**:

```bash
npm start
```

You should see something like:

```text
AI Ad Manager backend (Node) listening on http://localhost:3001
```

**Leave this terminal open.** The backend is now running. Don’t type anything else in this terminal for now.

---

## Part 3: Open a second terminal for the frontend

1. Click the **+** in the terminal panel (or **Terminal → New Terminal** again).
2. A **new** terminal tab opens. You’ll have two tabs: one running the backend, one free for the frontend.

---

## Part 4: Set the backend URL and start the frontend

**Step 1 — Go to the frontend folder**

In the **new** terminal tab, type and press **Enter**:

```bash
cd /Users/argylecryo/Documents/ghl-ai/frontend
```

**Step 2 — Create the env file**

Type and press **Enter** (this creates a file named `.env.local` with the backend URL):

```bash
echo 'BACKEND_URL=http://localhost:3001' > .env.local
```

**Step 3 — Start the frontend**

Type and press **Enter**:

```bash
npm run dev
```

Wait until you see something like:

```text
▲ Next.js 16.x.x
- Local: http://localhost:3000
```

**Leave this terminal open too.** The frontend is now running.

---

## Part 5: Use the app in your browser

1. Open your browser.
2. Go to: **http://localhost:3000**
3. Click **“Go to Experiments”** (or **“+ New Experiment”**).
4. Create a new experiment:
   - Name: e.g. **Test Campaign**
   - Platform: **Meta**
   - Ad idea / prompt: e.g. **Pain-free dental implants, same-day results**
   - How many ad variants: **3**
   - Total daily budget: **50**
5. Click **“Create experiment”**.
6. You should land on the experiment detail page with 3 variants. Edit any text and click **Save** on a variant, then **“Launch experiment”** when you’re ready.

---

## Quick reference

| What              | Command / URL                                      |
|-------------------|-----------------------------------------------------|
| Backend (Node)    | Terminal 1: `cd .../backend-examples/node` → `npm install` → `npm start` |
| Frontend          | Terminal 2: `cd .../frontend` → `echo 'BACKEND_URL=http://localhost:3001' > .env.local` → `npm run dev` |
| Open app          | Browser: **http://localhost:3000**                  |
| Backend API       | **http://localhost:3001** (used by frontend via proxy) |

---

## If you want to use Python instead of Node

1. **Stop the Node backend** in the first terminal: press **Ctrl+C**.
2. In that same terminal, run:

```bash
cd /Users/argylecryo/Documents/ghl-ai/frontend/backend-examples/python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 3001
```

3. Keep the frontend as-is (it already points to `http://localhost:3001`). Use the app at **http://localhost:3000** the same way.

---

## When you’re done

- In the **frontend** terminal: **Ctrl+C** to stop the dev server.
- In the **backend** terminal: **Ctrl+C** to stop the backend.
- You can close the terminal panel or leave it open.
