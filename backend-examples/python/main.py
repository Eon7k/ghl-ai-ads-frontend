"""
Example Python/FastAPI backend for the AI Ad Manager frontend.
Run: pip install -r requirements.txt && uvicorn main:app --reload --port 3001
Set PORT in env if needed. Frontend proxy should point BACKEND_URL here.

Matches BACKEND_API_SPEC.md in the frontend repo.
"""

import os
import uuid
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

# ----- In-memory store (replace with your DB later) -----
experiments: Dict[str, dict] = {}
variants_by_experiment: Dict[str, List[dict]] = {}


class CreateExperimentBody(BaseModel):
    name: str
    platform: str
    totalDailyBudget: float
    prompt: Optional[str] = None
    variantCount: Optional[int] = 5
    creativesSource: Optional[str] = "ai"  # "ai" or "own"


class UpdateVariantBody(BaseModel):
    copy: str


def _id() -> str:
    return str(uuid.uuid4())


async def generate_variants(prompt: str, count: int) -> List[str]:
    """
    Generate N ad copy variants from a prompt.
    PLACEHOLDER: returns fake copy. Replace with real LLM call (see below).
    """
    return [
        f"[Variant {i}] {prompt[:80]}... (Replace with AI-generated copy. See instructions in this file.)"
        for i in range(1, count + 1)
    ]

    # ----- OPTIONAL: Real AI generation (uncomment and add openai) -----
    # import openai
    # client = openai.AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    # response = await client.chat.completions.create(
    #     model="gpt-4o-mini",
    #     messages=[
    #         {"role": "system", "content": f"You are an ad copywriter. Generate exactly {count} different ad copy variants. Return ONLY a JSON array of {count} strings. Example: [\"First ad...\", \"Second ad...\"]"},
    #         {"role": "user", "content": prompt},
    #     ],
    #     response_format={"type": "json_object"},
    # )
    # import json
    # text = response.choices[0].message.content or "[]"
    # data = json.loads(text)
    # list_copy = data if isinstance(data, list) else data.get("variants", data.get("copies", []))
    # return [c if isinstance(c, str) else str(c) for c in list_copy[:count]]


# ----- Routes -----


@app.get("/experiments")
def list_experiments():
    """List all experiments (each with variants and variantCount)."""
    out = []
    for e in experiments.values():
        variants = variants_by_experiment.get(e["id"], [])
        out.append({**e, "variants": variants, "variantCount": e.get("variantCount") or len(variants)})
    return out


@app.get("/experiments/{experiment_id}")
def get_experiment(experiment_id: str):
    """Get one experiment with its variants."""
    if experiment_id not in experiments:
        raise HTTPException(status_code=404, detail="Experiment not found")
    exp = experiments[experiment_id]
    variants = variants_by_experiment.get(experiment_id, [])
    return {**exp, "variants": variants}


@app.post("/experiments")
async def create_experiment(body: CreateExperimentBody):
    """Create experiment and generate N variants from prompt (or empty if own creatives)."""
    count = max(1, min(20, body.variantCount or 3))
    source = "own" if body.creativesSource == "own" else "ai"
    prompt_text = (body.prompt or "").strip() or "Generate varied ad copy for this campaign."

    exp_id = _id()
    experiment = {
        "id": exp_id,
        "name": body.name,
        "platform": body.platform,
        "status": "draft",
        "phase": "setup",
        "totalDailyBudget": body.totalDailyBudget,
        "prompt": prompt_text,
        "variantCount": count,
        "creativesSource": source,
    }
    experiments[exp_id] = experiment

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
    variants_by_experiment[exp_id] = variants

    return {**experiment, "variants": variants}


@app.patch("/experiments/{experiment_id}/variants/{variant_id}")
def update_variant(experiment_id: str, variant_id: str, body: UpdateVariantBody):
    """Update one variant's ad copy."""
    variant_list = variants_by_experiment.get(experiment_id)
    if not variant_list:
        raise HTTPException(status_code=404, detail="Experiment not found")
    variant = next((v for v in variant_list if v["id"] == variant_id), None)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    variant["copy"] = body.copy
    return variant


@app.post("/experiments/{experiment_id}/launch")
def launch_experiment(experiment_id: str):
    """Mark experiment as launched."""
    if experiment_id not in experiments:
        raise HTTPException(status_code=404, detail="Experiment not found")
    experiments[experiment_id]["status"] = "launched"
    experiments[experiment_id]["phase"] = "running"
    return experiments[experiment_id]


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 3001))
    uvicorn.run(app, host="0.0.0.0", port=port)
