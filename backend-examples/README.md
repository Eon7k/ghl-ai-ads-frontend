# Backend examples — Node and Python

Your backend can be **Node** or **Python**. These folders contain **reference implementations** that match the frontend API spec (`BACKEND_API_SPEC.md` in the project root).

- **`node/`** — Express (Node.js) example.
- **`python/`** — FastAPI (Python) example.

Use the one that matches your stack. You can copy routes/handlers into your real backend and swap in your database and AI provider.

**What both examples do:**

1. `GET /experiments` — List experiments.
2. `POST /experiments` — Create experiment; generate N ad variants from prompt (placeholder or real LLM); return experiment with variants.
3. `GET /experiments/:id` — Get one experiment with variants.
4. `PATCH /experiments/:experimentId/variants/:variantId` — Update a variant’s copy.
5. `POST /experiments/:id/launch` — Mark experiment as launched.

**Storage:** Both use in-memory storage so you can run them without a database. Replace with your DB (Postgres, MongoDB, etc.) when ready.

**AI generation:** Both include a placeholder that returns fake variant copy. Instructions inside each example show how to plug in **OpenAI** (or another LLM) to generate real ad copy from the prompt.

---

## How to run and connect the frontend

### Node (Express)

1. Open a terminal and go to the Node example folder:
   ```bash
   cd backend-examples/node
   ```
2. Install and start:
   ```bash
   npm install
   npm start
   ```
   Server runs at `http://localhost:3001` (or set `PORT` in the environment).
3. In the **frontend** project, set the backend URL so the proxy talks to this server:
   - **Local:** In the frontend folder create or edit `.env.local` and add:
     ```bash
     BACKEND_URL=http://localhost:3001
     ```
   - Restart the frontend dev server (`npm run dev`). Then use the app at `http://localhost:3000`; creating an experiment will hit the Node backend.

### Python (FastAPI)

1. Open a terminal and go to the Python example folder:
   ```bash
   cd backend-examples/python
   ```
2. Create a virtual environment (recommended) and install:
   ```bash
   python3 -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Start the server:
   ```bash
   uvicorn main:app --reload --port 3001
   ```
   Server runs at `http://localhost:3001`.
4. In the **frontend** project, set `BACKEND_URL=http://localhost:3001` in `.env.local` and restart the frontend (same as Node step 3).

### Deploying to Render

- Deploy either the **Node** or **Python** app to Render (connect your repo and set the start command: Node `npm start`, Python `uvicorn main:app --host 0.0.0.0 --port $PORT`).
- Set the frontend’s **BACKEND_URL** in Vercel to your Render URL (e.g. `https://your-app.onrender.com`).
- No CORS change is required on the backend when the frontend uses the proxy; the browser only talks to Vercel.
