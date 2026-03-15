# Step-by-step: Get the backend (ghl-ai-backend) up to date

Your backend runs on Render from the GitHub repo **Eon7k/ghl-ai-backend**. Follow these steps in order. Do not skip steps.

---

## Part 1: Open your backend repo on your computer

### Step 1.1 — Decide where to put the backend folder

- You will work in a folder that contains the **ghl-ai-backend** repo.
- Example: `Documents` or `Documents/ghl-ai`. Pick a place you can find again.

### Step 1.2 — Clone the repo (if you don’t have it yet)

1. Open **Cursor’s terminal**: **Terminal** → **New Terminal**.
2. Go to the folder you chose. Example (change if yours is different):
   ```bash
   cd /Users/argylecryo/Documents
   ```
3. Clone the backend repo (use your real GitHub username if it’s not Eon7k):
   ```bash
   git clone https://github.com/Eon7k/ghl-ai-backend.git
   ```
4. Go into the repo:
   ```bash
   cd ghl-ai-backend
   ```
5. You should see files like `package.json` (Node) or `main.py` / `requirements.txt` (Python). Remember which one you see — you’ll need it in Part 2.

**If you already have ghl-ai-backend somewhere:**

1. In Cursor: **File** → **Open Folder**.
2. Choose the **ghl-ai-backend** folder (wherever it is on your Mac).
3. Open the terminal in Cursor and run:
   ```bash
   cd /path/to/ghl-ai-backend
   ```
   (Replace `/path/to/ghl-ai-backend` with the real path, e.g. `/Users/argylecryo/Documents/ghl-ai-backend`.)
4. Check what’s inside:
   ```bash
   ls
   ```
   - If you see **package.json** and **server.js** (or **index.js**): your backend is **Node**. Go to **Part 2A**.
   - If you see **main.py** or **app.py** and **requirements.txt**: your backend is **Python**. Go to **Part 2B**.

---

## Part 2A: Update a NODE backend (Express)

Do this only if your ghl-ai-backend has **package.json** and a main JS file (e.g. **server.js** or **index.js**).

### Step 2A.1 — Open the main server file

1. In Cursor’s file explorer (left side), open the file that starts the server.
   - Often named **server.js**, **index.js**, or **app.js**.
   - If you’re not sure, open **package.json** and look at the **"main"** or **"scripts"** → **"start"** line; it will say something like `node server.js` — that file is your main file.

### Step 2A.2 — Find the “create experiment” route (POST /experiments)

1. In that file, search for **POST** or **"/experiments"** or **app.post**.
2. You should see a block that handles creating a new experiment (it reads `name`, `platform`, `totalDailyBudget`, etc.).

### Step 2A.3 — Add creativesSource and “own” behavior

1. In the **request body** line (where you take values from `req.body`), add **creativesSource**:
   - Find the line that looks like:
     ```js
     const { name, platform, totalDailyBudget, prompt, variantCount } = req.body;
     ```
   - Change it to:
     ```js
     const { name, platform, totalDailyBudget, prompt, variantCount, creativesSource } = req.body;
     ```
2. Right after you compute **count** (number of variants), add:
   ```js
   const source = creativesSource === "own" ? "own" : "ai";
   ```
3. Add **creativesSource** and **variantCount** to the experiment object you save.
   - Find where you build the experiment object (e.g. `const experiment = { id, name, platform, ... }`).
   - Add these two fields:
     ```js
     variantCount: count,
     creativesSource: source,
     ```
4. When you create the **variants** (the ad copies):
   - If **source === "own"**: create `count` variants with **empty or placeholder** copy (e.g. `"Paste your ad copy here..."`), not AI-generated.
   - If **source === "ai"**: keep your current behavior (generate from prompt).
   - Example for “own”:
     ```js
     let copies;
     if (source === "own") {
       copies = Array.from({ length: count }, () => "");
     } else {
       copies = await generateVariants(promptText, count);  // your existing AI/placeholder
     }
     const variants = copies.map((copy, i) => ({
       id: uuid(),
       experimentId: id,
       index: i + 1,
       copy: copy || (source === "own" ? "Paste your ad copy here..." : copy),
       status: "draft",
     }));
     ```
   - Adjust to match your existing variable names (e.g. `uuid()` or your ID function).

### Step 2A.4 — List experiments: return variantCount

1. Find the **GET /experiments** route (e.g. `app.get("/experiments", ...)`).
2. When you build each experiment for the response, include **variantCount**:
   - If you already have a `variants` array, you can do:
     ```js
     variantCount: e.variantCount ?? variants.length
     ```
   - So each experiment in the list has a **variantCount** field (number).

### Step 2A.5 — Get one experiment: return creativesSource and variantCount

1. Find the **GET /experiments/:id** route (e.g. `app.get("/experiments/:id", ...)`).
2. The object you return (e.g. `res.json({ ...exp, variants })`) should already include whatever you store on the experiment. Ensure the saved experiment has **creativesSource** and **variantCount** (you added them in Step 2A.3). If you spread `exp` into the response, they’ll be there. If not, add them explicitly to the response object.

### Step 2A.6 — Save the file

1. **File** → **Save** (or Cmd+S).

Then go to **Part 3**.

---

## Part 2B: Update a PYTHON backend (FastAPI or Flask)

Do this only if your ghl-ai-backend has **main.py** or **app.py** and **requirements.txt**.

### Step 2B.1 — Open the main app file

1. In Cursor’s file explorer, open **main.py** or **app.py** (the one that defines the routes).

### Step 2B.2 — Create experiment request body: add creativesSource

1. Find the **Pydantic model** or the place where you define the body for **POST /experiments** (e.g. `CreateExperimentBody` or similar).
2. Add a field:
   ```python
   creativesSource: Optional[str] = "ai"  # "ai" or "own"
   ```
   If you don’t have Optional, add at top: `from typing import Optional`.

### Step 2B.3 — Create experiment logic: handle "own"

1. Find the **POST /experiments** route (e.g. `def create_experiment(body: ...)` or `async def create_experiment(...)`).
2. Right after you get **count** (number of variants), add:
   ```python
   source = "own" if body.creativesSource == "own" else "ai"
   ```
3. Add **creativesSource** and **variantCount** to the **experiment** dict you save:
   ```python
   "variantCount": count,
   "creativesSource": source,
   ```
4. When building the **variants** list:
   - If **source == "own"**: create `count` variants with empty or placeholder copy (e.g. `"Paste your ad copy here..."`).
   - If **source == "ai"**: keep your current behavior (generate from prompt).
   - Example:
     ```python
     if source == "own":
         copies = [""] * count
     else:
         copies = await generate_variants(prompt_text, count)
     variants = [
         {
             "id": _id(),
             "experimentId": exp_id,
             "index": i + 1,
             "copy": copy or ("Paste your ad copy here..." if source == "own" else copy),
             "status": "draft",
         }
         for i, copy in enumerate(copies)
     ]
     ```
   - Use your real function names (e.g. `_id()`, `generate_variants`).

### Step 2B.4 — List experiments: return variantCount

1. Find the **GET /experiments** route.
2. For each experiment in the response, include **variantCount**:
   - e.g. `"variantCount": e.get("variantCount") or len(variants)` when building each item in the list.

### Step 2B.5 — Get one experiment: return creativesSource and variantCount

1. Find the **GET /experiments/:id** route.
2. The experiment dict you return should already have **creativesSource** and **variantCount** if you stored them in Step 2B.3. If you build the response by hand, add those two keys.

### Step 2B.6 — Save the file

1. **File** → **Save** (or Cmd+S).

Then go to **Part 3**.

---

## Part 3: Push the backend repo to GitHub

Do this from the **ghl-ai-backend** folder.

### Step 3.1 — Open terminal in the backend folder

1. In Cursor, open the terminal (bottom panel).
2. Make sure you’re in the backend repo:
   ```bash
   cd /Users/argylecryo/Documents/ghl-ai-backend
   ```
   (Use the real path to **ghl-ai-backend** on your Mac if different.)
3. Check you’re in the right place:
   ```bash
   git status
   ```
   You should see “On branch main” and a list of modified files. If you see “not a git repository”, you’re in the wrong folder.

### Step 3.2 — Stage and commit

1. Stage all changes:
   ```bash
   git add .
   ```
2. Commit with a clear message:
   ```bash
   git commit -m "Add creativesSource and variantCount for Phase 2 frontend"
   ```
3. If Git asks you to set user.name or user.email, do that first, then run the **git commit** again.

### Step 3.3 — Push to GitHub

1. Push to the **main** branch:
   ```bash
   git push origin main
   ```
2. If it asks for username/password, use your GitHub login (or a **Personal Access Token** if you use 2FA).  
3. Wait until you see something like: `main -> main` or `Everything up-to-date`. That means GitHub has the new code.

---

## Part 4: Deploy on Render

### Step 4.1 — Open Render

1. In your browser, go to **https://dashboard.render.com**.
2. Log in if needed.

### Step 4.2 — Open your backend service

1. On the dashboard, click the **service** that is your backend (the one connected to **Eon7k/ghl-ai-backend**).
2. You should see the service overview (logs, metrics, etc.).

### Step 4.3 — Start a deploy

1. In the top-right of the service page, click **Manual Deploy**.
2. In the menu, click **Deploy latest commit**.
3. A new deploy will appear in the **Events** or **Deployments** list. Click it to see the log.

### Step 4.4 — Wait until it’s live

1. Watch the deploy log. You should see steps like “Building”, “Starting”, etc.
2. When the status at the top changes to **Live** (green), the backend is updated.
3. If the build fails, open the log and read the red error lines; fix that in your code, then run **Part 3** again (commit + push) and **Manual Deploy** again.

---

## Part 5: Test from the frontend

1. Open your **live frontend** in the browser (your Vercel URL or custom domain).
2. Go to **Experiments** → **+ New Experiment**.
3. Choose **“I’ll use my own (paste per variant)”** and fill the rest (name, platform, variants count, budget). Create the experiment.
4. You should land on the experiment detail page with empty/placeholder copy for each variant. Paste something into one variant and click **Save**.
5. If that works, the backend is up to date. If you get an error, check the browser’s **Network** tab for the failing request and the error message.

---

## Quick checklist

- [ ] Backend repo **ghl-ai-backend** is open in Cursor (or cloned and opened).
- [ ] **POST /experiments** reads **creativesSource** and, when `"own"`, creates variants with empty/placeholder copy.
- [ ] Experiment object stored and returned includes **creativesSource** and **variantCount**.
- [ ] **GET /experiments** and **GET /experiments/:id** return **variantCount** (and **creativesSource** on the experiment).
- [ ] Changes committed and **pushed** to **main** on GitHub.
- [ ] On Render, **Manual Deploy** → **Deploy latest commit** run and deploy is **Live**.
- [ ] Live frontend: create experiment with “I’ll use my own” and confirm variants appear and Save works.

If you tell me whether your backend is **Node** or **Python** and the **exact file and line** where you create the experiment (e.g. “server.js line 82”), I can give you a minimal patch (exact edits) for that file next.
