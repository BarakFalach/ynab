# YNAB Web

Next.js (TypeScript, App Router) frontend + backend for YNAB automation tooling.
Currently hosts the **payee category override** manager.

This app is intentionally separate from the root repo (its own `package.json`)
and deploys as its own Vercel project. The Playwright scraper / mapper / scheduled
job stay on the existing Railway worker.

## Local development

```bash
cd web
npm install
cp .env.local.example .env.local   # then fill in the values from the repo root .env
npm run dev
```

Open http://localhost:3000 — it redirects to `/overrides`.

## Environment variables (server-only, no NEXT_PUBLIC_ prefix)

| Var | Purpose |
| --- | --- |
| `YNAB_ACCESS_TOKEN` | YNAB API bearer token |
| `BUDGET_ID` | YNAB budget id |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |

All YNAB and Supabase access happens in server route handlers, so keys never
reach the browser.

## Supabase

Requires the `payee_overrides` table — see `../OVERRIDES_SETUP.md` for the DDL.

## API routes

- `GET /api/payees` — non-deleted YNAB payees (5-min cache)
- `GET /api/categories` — flattened YNAB categories, excludes hidden/deleted (5-min cache)
- `GET /api/overrides` — list overrides
- `POST /api/overrides` — upsert `{ payee_name, category_id, category_name }` (payee normalized server-side)
- `DELETE /api/overrides/[payee]` — delete one override

## Deploying to Vercel

Create a **new** Vercel project with **Root Directory = `web`** (do not reuse the
root-linked project — the root `vercel.json` rewrites everything to the Express
server). Set the four env vars above in Production + Preview.
