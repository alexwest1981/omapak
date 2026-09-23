# omapak.org — web/

SvelteKit (adapter-static, CSR-only SPA) + Tailwind 4 + Mercury design tokens.
Served from Cloudflare Pages; data comes from the R2-backed worker at
`repo.omapak.org`.

## Quickstart

```
cd web
bun install
bun run sync-rubric                    # rubric + mission markdown → src/lib/generated/
bun run build-catalog --with-fixtures  # static/data/catalog.json from ../apps + ../fixtures
bun run dev                            # http://localhost:5217
```

`--with-fixtures` adds `fixtures/testapp` (verdict chips, report page) to the
**local fallback** catalog — it never reaches the live site. Skip it for a
catalog that mirrors exactly what `apps/` contains.

`bun run dev` runs `predev` first (rubric sync + catalog rebuild), so the
generated data is always current after a pull — run `bun run build-catalog
--with-fixtures` once if you want the fixture app in the fallback catalog.

The dev server talks to `http://localhost:8787` (see `.env.development`) —
start the store API locally with `cd ../api && bun run dev` if you want
accounts/reviews against your machine; otherwise it falls back to static
data and reviews show their offline state.

## Where the data comes from

Store pages (`/apps`, `/app/<id>`, reviews, sign-in) populate from
**api.omapak.org/v1** — the same contract the future desktop app uses
(see `../api/README.md`). Everything falls back to static data when the API
is unreachable, so offline still renders:

| Query (`src/lib/api/queries.ts`) | Primary | Fallback |
|---|---|---|
| apps list / app detail / categories / featured | `https://api.omapak.org/v1/apps…` | static `/data/catalog.json` + `/data/flathub.json`, normalized client-side |
| reviews (read/write), `/v1/me`, magic-link auth | `https://api.omapak.org/v1/…` | none — reviews show an offline note |
| app report (judge accordion) | `https://repo.omapak.org/reports/<id>.json` | `/data/reports/<id>.json` (static) |
| homepage stats | `https://repo.omapak.org/data/catalog.json` | `/data/catalog.json` (static) |

API base comes from `VITE_API_BASE` (`https://api.omapak.org` in prod,
`http://localhost:8787` in dev via `.env.development`). Consequences:

- The static fallback is only as fresh as your last `build-catalog` run —
  `bun run build` does **not** regenerate `static/data/`.
- `static/data/flathub.json` (~900KB, the pass-through Flathub listing, with
  appstream categories) is refreshed by `bun run build-flathub-index` — 24h
  cache by default, `--force` to ignore, `--limit 50` for quick dev
  iteration, `--push` to also upload it to R2 (`data/flathub.json`) for the
  API worker (CI does this on every site deploy).

## Scripts

| Script | What it does |
|---|---|
| `dev` | vite dev server on port 5217 |
| `build` | production build to `build/` (does not touch `static/data/`) |
| `preview` | serves `build/` (4173, or 4319 if busy) |
| `typecheck` | svelte-check |
| `sync-rubric` | regenerates `src/lib/generated/rubric.ts` from `crates/omapak-judge/src/prompt.rs` |
| `build-catalog [--with-fixtures]` | regenerates `static/data/catalog.json` + report JSONs from `apps/` (and `fixtures/`) |
| `build-flathub-index [--force] [--limit N] [--push]` | refreshes the Flathub pass-through index (categories included) |

## Verifying changes headlessly (traps)

The site is CSR-only — only `index.html` is prerendered, so `curl` cannot
verify rendered content. Use headless chromium, and mind:

- `--dump-dom` needs `--virtual-time-budget=20000` or you capture the
  pre-hydration skeleton (~1.7KB); even then a screenshot can catch a
  half-hydrated page — trust DOM greps over single screenshots.
- Sandboxed shells block the cross-origin `repo.omapak.org` fetches; the
  page then sits on "loading…" and looks broken when it isn't. Run the
  browser with network unblocked.
- Headless chromium defaults to dark `prefers-color-scheme` → the site
  renders `mercury` (dark). Force light with
  `--blink-settings=preferredColorScheme=1`.
- Background dev/preview servers die when the shell call ends — start,
  wait for the port, capture, and kill in one command (`ss -ltn`, not
  `lsof`, to check ports).

## Design

Mercury — Outcrop Labs' system: near-black instrument surfaces, cream
readout, warm gold for action, safety orange for failure only; matte, no
glows or gradients. Tokens live in `src/app.css` (`[data-theme="mercury"]`
and `mercury-light`); the theme switch persists to `localStorage`
(`omapak-theme`).
