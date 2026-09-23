# api.omapak.org — api/

The store API: accounts, reviews, and a normalized view of the catalog. One
versioned contract serves both the website and the future omapak desktop app
(populate from the same endpoints; the machine-readable schema is
`GET /v1/openapi.json`).

TypeScript + [Hono](https://hono.dev) on Cloudflare Workers, D1 (SQLite) for
accounts/reviews, read-only R2 binding to the `omapak-repo` bucket for catalog
data (`data/catalog.json`, `data/flathub.json` — the same objects
repo.omapak.org serves, pushed by CI).

## The v1 contract

| Endpoint | What |
|---|---|
| `GET /v1/apps?q=&source=&category=&limit=&offset=` | app list (omapak hosted + flathub pass-through) with review aggregates and category counts |
| `GET /v1/apps/:id` | app detail (`install` command, `report_url` when a public judge report exists) |
| `GET /v1/apps/:id/reviews` | reviews, newest first |
| `POST /v1/apps/:id/reviews` | upsert your review `{rating: 1–5, body?}` (one per user per app; auth) |
| `DELETE /v1/reviews/:id` | delete your review (auth) |
| `GET /v1/categories` | fixed taxonomy + live counts |
| `GET /v1/featured` | hero pick: top-rated omapak apps, rotated daily |
| `POST /v1/auth/magic-link` | email a single-use sign-in link (15 min TTL); always 202 on valid input |
| `GET /v1/auth/verify?token=` | consume link → session cookie → redirect to `{SITE_ORIGIN}/auth/callback` |
| `POST /v1/auth/logout` | clear the session cookie |
| `GET /v1/me` · `PATCH /v1/me` | profile (display name) |
| `GET /v1/openapi.json` | OpenAPI 3.1 schema |

**Categories** are a fixed taxonomy (Audio & Video, Development, Education,
Games, Graphics, Network, Office & Productivity, Science, Settings, System,
Utilities). Flathub entries arrive with real appstream categories; omapak's
free-form metadata tags map through `src/categories.ts` (mirrored client-side
in `web/src/lib/api/normalize.ts` for offline fallback — keep them in sync).

**Reviews** are accepted for anything installable from the omapak remote —
omapak-hosted and flathub apps alike — validated against the live catalog
indexes.

**Auth** is email magic links only; no passwords are ever stored. Sessions
are stateless HS256 JWTs (7 days) in an httpOnly `SameSite=None` cookie
(`oma_session`) and equally accepted as `Authorization: Bearer` — the
desktop-app path. Link generation is throttled (5/email and 20/IP per 15 min,
D1-backed).

## Local development

```
cd api
bun install
cp .dev.vars.example .dev.vars   # dev secret, localhost origins, ALLOW_DEV_LINKS=1
bun run migrate:local            # D1 schema into .wrangler/state
bun run seed:local               # copies web/static/data/*.json into local R2
bun run dev                      # http://localhost:8787
bun run e2e                      # 39 assertions against the dev server
```

Without `RESEND_API_KEY` (and with `ALLOW_DEV_LINKS=1`), the magic link is
returned in the API response as `dev_link` instead of emailed — the whole
auth → review flow runs locally with zero mail setup. Never set
`ALLOW_DEV_LINKS` in production.

The web dev server picks the local API up automatically via
`web/.env.development` (`VITE_API_BASE=http://localhost:8787`).

## Production setup (one-time ops)

1. `bunx wrangler d1 create omapak-api` → paste the id into `wrangler.toml`.
2. Secrets: `wrangler secret put SESSION_SECRET` (32+ random chars),
   `wrangler secret put RESEND_API_KEY` (transactional email).
3. DNS: point `api.omapak.org` at the worker (route is in `wrangler.toml`).
4. Resend: verify the `omapak.org` sending domain (SPF/DKIM) and use a
   matching `MAIL_FROM`.
5. `bun run migrate` (remote D1) before the first deploy.

CI (`.github/workflows/api-deploy.yml`) runs typecheck + deploys on every
push to `main` touching `api/**`, applying migrations first.

## Data freshness

Catalog reads go through the Cache API with a 5-minute TTL, so new pushes
(R2 `data/catalog.json` by the site workflow, `data/flathub.json` by
`build-flathub-index --push`) land within minutes. Reviews are always live
from D1.
