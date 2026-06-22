# Image Moderation Service

A standalone FastAPI microservice that classifies an image against the same
policies as the text classifier. The Next.js app calls it over HTTP.

## Run

```bash
cd services/image-moderation
python -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- `GET  /health` — check the service and which engine is active.
- `POST /moderate-image` — body: `{ "image_url": "https://...", "context": "optional caption" }`

Set `OPENAI_API_KEY` in your environment to use the real vision model; otherwise
a mock engine runs (it keys off hints in the image URL so you can still demo).

## Wire it into the Next.js app

In `src/app/api/moderate/route.ts`, when an `imageUrl` is present, call this
service and merge its verdict. The route already passes `imageUrl` through; set
`IMAGE_SERVICE_URL=http://localhost:8000` in the Next app's `.env` to enable it.

## Swap in your own vision model

`classify_with_vision` currently uses OpenAI vision. To use a local model (e.g.
a fine-tuned ResNet or CLIP), replace that function's body with your model's
inference and return the same `Verdict` shape. Everything else stays the same.
