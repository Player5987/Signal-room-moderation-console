# Moderation Console

An LLM-powered content moderation platform: submit text, the model classifies
it against configurable policies, flagged items enter a human review queue, and
every decision is logged. A compact, honest version of what trust & safety
companies (SafetyKit, Character.ai, marketplaces) build.

> Stage 1 of 3. This is the runnable full-stack core. Stages 2–3 (image
> moderation microservice, evaluation harness, natural-language policy editor)
> are scoped at the bottom.

## Stack

| Layer        | Choice                          | Why |
|--------------|---------------------------------|-----|
| Web + API    | Next.js (App Router) + TypeScript | One codebase, industry-standard, adds the TS keyword |
| Styling      | Tailwind + CSS tokens           | Fast, consistent console UI |
| Database     | Prisma ORM → SQLite (dev) / Postgres (prod) | Type-safe queries; one-line swap to Postgres |
| Model        | OpenAI API (structured JSON)    | Forces machine-readable verdicts; mock fallback when no key |

## Architecture

```
            ┌──────────────┐   POST /api/moderate   ┌────────────────┐
 Submit UI ─┤  Next.js app ├───────────────────────▶│ moderation lib │
            │  (React)     │                         │  LLM ↔ mock    │
 Queue UI  ─┤              │◀── GET /api/queue ──────┤                │
            └──────┬───────┘   POST /api/review      └───────┬────────┘
                   │                                         │
                   ▼                                         ▼
            ┌──────────────────────────────────────────────────┐
            │ Prisma → SQLite/Postgres                          │
            │ User · ContentItem · ModerationResult · ReviewAction │
            └──────────────────────────────────────────────────┘
```

Flow: content comes in `pending` → flips to `processing` while the model runs
→ a `ModerationResult` is stored → status `reviewed` → a human records a
`ReviewAction` (approve / remove / override).

## Run it locally

```bash
npm install
cp .env.example .env        # SQLite by default — no DB to install
npm run db:push             # create the database tables
npm run db:seed             # add a reviewer + sample content
npm run dev                 # http://localhost:3000
```

Open `http://localhost:3000` to submit content, and `/queue` to review.

**Use the real LLM (optional):** put a key in `.env` as `OPENAI_API_KEY="sk-..."`.
Without it, a built-in keyword mock classifier runs so everything still works.

## Switch to Postgres for production

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Set `DATABASE_URL` to your Postgres connection string (Neon / Supabase).
3. `npm run db:push`.

## Deploy

- Push to GitHub, import the repo on **Vercel**.
- Add `DATABASE_URL` (Neon/Supabase Postgres) and `OPENAI_API_KEY` as env vars.
- Vercel builds and gives you a live URL — put that in your résumé/application.

## Evaluation (Stage 2)

Measure how good the classifier is against a labeled set:

```bash
npm run eval          # runs the classifier over eval/dataset.json, prints metrics
```

It reports accuracy, macro precision / recall / F1, a per-category table, and
writes `eval/results.json`. View it in the app at `/eval` (with a confusion
matrix heatmap). With `OPENAI_API_KEY` set you measure the real LLM; without it,
the mock engine. Add your own labeled rows to `eval/dataset.json` to grow the set.

## Image moderation (Stage 2)

A standalone FastAPI microservice in `services/image-moderation` classifies
images against the same policies. Run it and set `IMAGE_SERVICE_URL` in `.env`;
the `/api/moderate` route will then also score any submitted image and combine
the verdicts. See `services/image-moderation/README.md`.

## Policy editor (Stage 3)

Policies live in the database and are editable at runtime from the **Policies**
page. Add a rule in plain English (e.g. "Content promoting betting or casinos")
and the classifier enforces it on the next submission — no code change, no
retraining. Only **active** policies are sent to the model. Built-in policies
can be disabled but not deleted.

This is the LLM payoff: a keyword list or a trained classifier can't add a new
category without new code or new training data. An instruction-following model
can, because the rule is just text in the prompt. (Note: the keyword *mock*
engine only knows the built-in categories, so brand-new policies only take real
effect with `OPENAI_API_KEY` set.)

## Roadmap

- Real auth (Auth.js or Clerk) replacing the seeded demo reviewer.
- A few tests (Vitest) on the classifier, the metrics, and the API routes.
- Per-policy eval, and image policies that are editable too.

## Project layout

```
prisma/schema.prisma     data model (4 tables)
prisma/seed.ts           demo data
src/lib/policies.ts      the violation categories (edit here to add policies)
src/lib/moderation.ts    classifier: LLM engine + mock fallback
src/lib/prisma.ts        shared DB client
src/app/api/moderate     ingest + classify endpoint
src/app/api/queue        list-for-review endpoint
src/app/api/review       record human decision endpoint
src/app/page.tsx         submit UI
src/app/queue/page.tsx   review dashboard
```

## Admin access (Stage 4)

The Dashboard, Evaluation, and Policies areas are staff-only, gated by middleware.
Set a password with `ADMIN_PASSWORD` in `.env` (defaults to `admin`). Click
**Admin sign in**, enter it, and the admin nav links appear. Sign-in sets an
httpOnly session cookie; it's intentionally lightweight (a hashed-password token),
not a full auth system — swap in Auth.js or Clerk for production.

## Deploy to Vercel

The app is built for SQLite locally; Vercel's filesystem is ephemeral, so use a
hosted Postgres for production.

1. **Postgres:** create a free database at neon.tech (or supabase.com) and copy its
   connection string.
2. **Schema:** in `prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"`.
3. **Push code to GitHub**, then import the repo at vercel.com.
4. **Environment variables in Vercel** → Settings → Environment Variables:
   - `DATABASE_URL` = your Postgres URL
   - `ADMIN_PASSWORD` = a strong password
   - `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` (your Groq/Gemini/OpenAI setup)
5. **Deploy.** `postinstall` runs `prisma generate` automatically. After the first
   deploy, push the schema and seed once from your machine against the prod DB:
   ```bash
   DATABASE_URL="your-prod-url" npx prisma db push
   DATABASE_URL="your-prod-url" npm run db:seed
   ```
6. Visit your `*.vercel.app` URL.

Notes: the Python image service isn't part of the Vercel deploy (deploy it
separately on Render/Railway and set `IMAGE_SERVICE_URL`, or leave image
moderation off). The committed `eval/results.json` is served read-only in
production; re-run `npm run eval` locally to refresh it.

## Stage 5 — Google sign-in, per-user history, multilingual

The app is now multi-tenant. Sign-in is **Google OAuth** (Auth.js), the password
gate is gone, and every submission is owned by the signed-in user.

- **Normal users** see only their own submissions ("My history").
- **Admins** (emails listed in `ADMIN_EMAILS`) see everyone's queries plus the
  Dashboard, Evaluation, and Policies, and are the ones who approve/remove items.
- The classifier is **language-agnostic**: it detects violations by meaning in any
  language (with the real LLM) and reports the detected language. The mock engine
  remains English-only.

### Google OAuth setup (required for sign-in)

1. Go to Google Cloud Console -> APIs & Services -> Credentials.
2. Configure the OAuth consent screen (External; add your email as a test user).
3. Create an **OAuth client ID** -> Web application. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-APP.vercel.app/api/auth/callback/google`
4. Copy the Client ID and Client Secret into `.env` as `AUTH_GOOGLE_ID` /
   `AUTH_GOOGLE_SECRET`.
5. Generate `AUTH_SECRET` with `npx auth secret`. List admin emails in `ADMIN_EMAILS`.

### Env vars (local `.env` and Vercel)

`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
`ADMIN_EMAILS`, and optionally `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL`.
After deploying, add the Vercel callback URL to the Google client (step 3).
