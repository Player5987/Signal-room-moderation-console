"""
Image moderation microservice.

A small, separate Python service that classifies an IMAGE against the same
policies as the text classifier, returning the same JSON verdict shape. The
Next.js app calls this over HTTP — that's the "microservice" pattern, and it
mirrors how trust & safety platforms run specialized vision models alongside
their text models.

Two engines (same idea as the TypeScript classifier):
  - "vision-llm": calls OpenAI's vision model when OPENAI_API_KEY is set.
  - "mock":       a deterministic fallback so the service runs with no key.

Run it:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
Then POST to http://localhost:8000/moderate-image
"""

import os
import json
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Image Moderation Service")

# Allow the Next.js dev server (localhost:3000) to call this service.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

POLICIES = {
    "harassment": "Hateful symbols, targeted abuse, or threatening imagery.",
    "spam": "Promotional clutter, misleading ads, or repetitive junk imagery.",
    "scam": "Phishing screenshots, fake giveaways, or fraudulent offers.",
    "sexual": "Explicit nudity or sexual content.",
    "ip_violation": "Counterfeit goods, brand logos on fakes, or pirated media.",
}
ALL_CATEGORIES = list(POLICIES.keys()) + ["clean"]


class ImageRequest(BaseModel):
    image_url: str
    # Optional caption/context the submitter provided.
    context: Optional[str] = None


class Verdict(BaseModel):
    category: str
    confidence: float
    scores: dict
    rationale: str
    engine: str


def clamp(x) -> float:
    try:
        return max(0.0, min(1.0, float(x)))
    except (TypeError, ValueError):
        return 0.0


def normalize_scores(raw) -> dict:
    out = {c: 0.0 for c in ALL_CATEGORIES}
    if isinstance(raw, dict):
        for c in ALL_CATEGORIES:
            out[c] = clamp(raw.get(c, 0.0))
    return out


# ---------- Engine 1: the real vision model ----------

def classify_with_vision(image_url: str, context: Optional[str]) -> Verdict:
    from openai import OpenAI

    client = OpenAI(
        api_key=os.environ["OPENAI_API_KEY"],
        base_url=os.environ.get("OPENAI_BASE_URL") or None,
    )
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    policy_lines = "\n".join(f"- {k}: {v}" for k, v in POLICIES.items())
    system = (
        "You are an image content moderation engine. Classify the image against "
        f"these policies:\n{policy_lines}\n\n"
        "Respond with ONLY a JSON object: "
        '{"category": "...", "confidence": 0..1, '
        '"scores": {<each category>: 0..1}, "rationale": "one short sentence"}. '
        'Use "clean" when no policy is violated.'
    )
    user_content = [{"type": "image_url", "image_url": {"url": image_url}}]
    if context:
        user_content.append({"type": "text", "text": f"Caption: {context}"})

    resp = client.chat.completions.create(
        model=model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
    )
    parsed = json.loads(resp.choices[0].message.content or "{}")
    return Verdict(
        category=parsed.get("category", "clean"),
        confidence=clamp(parsed.get("confidence", 0)),
        scores=normalize_scores(parsed.get("scores")),
        rationale=parsed.get("rationale", "No rationale provided."),
        engine="vision-llm",
    )


# ---------- Engine 2: the mock fallback ----------
# Without a real model we can't inspect pixels, so the mock keys off hints in
# the URL/filename (e.g. ".../nsfw_photo.jpg"). Crude, but it lets the whole
# pipeline run and demo end to end.

URL_HINTS = {
    "sexual": ["nsfw", "nude", "explicit"],
    "ip_violation": ["replica", "fake", "counterfeit", "logo"],
    "scam": ["giveaway", "phishing", "scam"],
    "harassment": ["hate", "threat"],
    "spam": ["ad", "promo", "spam"],
}


def classify_with_mock(image_url: str) -> Verdict:
    lower = image_url.lower()
    scores = {c: 0.0 for c in ALL_CATEGORIES}
    top, top_score = "clean", 0.0
    for category, hints in URL_HINTS.items():
        if any(h in lower for h in hints):
            scores[category] = 0.8
            if 0.8 > top_score:
                top, top_score = category, 0.8
    if top_score == 0.0:
        scores["clean"] = 0.9
        return Verdict(
            category="clean",
            confidence=0.9,
            scores=scores,
            rationale="No risk hints in image reference (mock engine).",
            engine="mock",
        )
    return Verdict(
        category=top,
        confidence=top_score,
        scores=scores,
        rationale=f"URL hint matched {top} (mock engine — add OPENAI_API_KEY for real vision).",
        engine="mock",
    )


@app.get("/health")
def health():
    return {"status": "ok", "engine": "vision-llm" if os.environ.get("OPENAI_API_KEY") else "mock"}


@app.post("/moderate-image", response_model=Verdict)
def moderate_image(req: ImageRequest):
    if os.environ.get("OPENAI_API_KEY"):
        try:
            return classify_with_vision(req.image_url, req.context)
        except Exception as e:  # never let the vision call break the pipeline
            print(f"vision classify failed, falling back to mock: {e}")
            return classify_with_mock(req.image_url)
    return classify_with_mock(req.image_url)
