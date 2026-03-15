/**
 * Example Node/Express backend for the AI Ad Manager frontend.
 * Run: npm install && npm start
 * Set PORT in env (default 3001). Frontend proxy should point BACKEND_URL here.
 *
 * Matches BACKEND_API_SPEC.md in the frontend repo.
 */

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ----- In-memory store (replace with your DB later) -----
const experiments = new Map();
const variantsByExperiment = new Map();

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/x/g, () =>
    ((Math.random() * 16) | 0).toString(16)
  );
}

/**
 * Generate N ad copy variants from a prompt.
 * PLACEHOLDER: returns fake copy. Replace with real LLM call (see below).
 */
async function generateVariants(prompt, count) {
  const out = [];
  for (let i = 1; i <= count; i++) {
    out.push(
      `[Variant ${i}] ${prompt.slice(0, 80)}... (Replace with AI-generated copy. See instructions in this file.)`
    );
  }
  return out;

  /* ----- OPTIONAL: Real AI generation (uncomment and add openai package) -----
  const OpenAI = require("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an ad copywriter. Generate exactly ${count} different ad copy variants for the given idea. Each must be distinct in angle or tone. Return ONLY a JSON array of ${count} strings, no other text. Example: ["First ad copy...", "Second ad copy..."]`,
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });
  const text = completion.choices[0]?.message?.content || "[]";
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : (parsed.variants || parsed.copies || []);
  return list.slice(0, count).map((c) => (typeof c === "string" ? c : c.copy || c.text || String(c)));
  */
}

// ----- Routes -----

// List experiments (include variantCount for budget-per-variant display)
app.get("/experiments", (req, res) => {
  const list = Array.from(experiments.values()).map((e) => {
    const v = variantsByExperiment.get(e.id) || [];
    return { ...e, variants: v, variantCount: e.variantCount ?? v.length };
  });
  res.json(list);
});

// Get one experiment with variants
app.get("/experiments/:id", (req, res) => {
  const exp = experiments.get(req.params.id);
  if (!exp) return res.status(404).json({ error: "Experiment not found" });
  const variants = variantsByExperiment.get(exp.id) || [];
  res.json({ ...exp, variants });
});

// Create experiment and generate variants
app.post("/experiments", async (req, res) => {
  const { name, platform, totalDailyBudget, prompt, variantCount, creativesSource } = req.body;
  if (!name || !platform || totalDailyBudget == null) {
    return res.status(400).json({ error: "Missing name, platform, or totalDailyBudget" });
  }

  const id = uuid();
  const count = Math.min(20, Math.max(1, Number(variantCount) || 3));
  const source = creativesSource === "own" ? "own" : "ai";
  const promptText =
    typeof prompt === "string" && prompt.trim()
      ? prompt.trim()
      : "Generate varied ad copy for this campaign.";

  const experiment = {
    id,
    name,
    platform,
    status: "draft",
    phase: "setup",
    totalDailyBudget: Number(totalDailyBudget),
    prompt: promptText,
    variantCount: count,
    creativesSource: source,
  };
  experiments.set(id, experiment);

  let copies;
  if (source === "own") {
    copies = Array.from({ length: count }, (_, i) => "");
  } else {
    copies = await generateVariants(promptText, count);
  }
  const variants = copies.map((copy, i) => ({
    id: uuid(),
    experimentId: id,
    index: i + 1,
    copy: copy || (source === "own" ? "Paste your ad copy here..." : copy),
    status: "draft",
  }));
  variantsByExperiment.set(id, variants);

  res.status(201).json({ ...experiment, variants });
});

// Update variant copy
app.patch("/experiments/:experimentId/variants/:variantId", (req, res) => {
  const { experimentId, variantId } = req.params;
  const { copy } = req.body;
  if (typeof copy !== "string") {
    return res.status(400).json({ error: "Body must include copy (string)" });
  }

  const list = variantsByExperiment.get(experimentId);
  if (!list) return res.status(404).json({ error: "Experiment not found" });
  const variant = list.find((v) => v.id === variantId);
  if (!variant) return res.status(404).json({ error: "Variant not found" });

  variant.copy = copy;
  res.json(variant);
});

// Launch experiment
app.post("/experiments/:id/launch", (req, res) => {
  const exp = experiments.get(req.params.id);
  if (!exp) return res.status(404).json({ error: "Experiment not found" });
  exp.status = "launched";
  exp.phase = "running";
  res.json(exp);
});

// ----- Start -----
app.listen(PORT, () => {
  console.log(`AI Ad Manager backend (Node) listening on http://localhost:${PORT}`);
});
