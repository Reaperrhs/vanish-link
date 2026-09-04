# VanishLink

Self-hosted URL shortener with privacy-focused link types, powered by [Appwrite](https://appwrite.io).

## Features

- **Standard links** — permanent redirects with click tracking
- **Burn after reading** — one-time links that deactivate the moment they're opened
- **24h links** — links that expire 24 hours after creation
- **Master/child links** — generate tracked one-time links under a master link (generated vs. burned counts)
- **Workspaces** — group links into personal or named workspaces
- **Analytics** — clicks, unique visitors (hashed IPs), devices, browsers, referrers, countries, and 7-day click trends
- **QR codes** — per-link QR generation
- **MCP server** — control VanishLink from AI agents (`npm run mcp`)

## Architecture

```
Browser ──► React/Vite SPA ──► Appwrite (direct: list/delete/realtime)
                │
                └────────────► Express backend :3000 ──► Appwrite (API key)
                                   │
                                   └─► POST /:slug redirects + telemetry
```

- `backend/index.js` — Express API: shorten, redirect, analytics, resets, workspaces, sweep
- `frontend/` — React 19 + Vite + Tailwind SPA
- `mcp-server.mjs` — Model Context Protocol server (stdio)
- Appwrite collections: `links`, `workspaces`, `analytics_telemetry`

## Setup

### 1. Appwrite

Create a project, an API key (documents read/write on your database), and copy the env templates:

```bash
cp backend/.env.example backend/.env    # fill in Appwrite credentials + IDs
cp frontend/.env.example frontend/.env  # fill in browser-facing values
```

Then create the database, collections, and attributes:

```bash
npm install
npm run init:appwrite
```

Optional — enable country tracking in analytics (offline GeoIP lookup, IP is hashed right after):

```bash
npm run migrate:country
```

### 2. Run locally

```bash
npm start                      # backend on :3000
cd frontend && npm install && npm run dev   # SPA on :5173
```

### 3. Docker

`docker-compose.yml` builds both services (backend :3000, frontend behind nginx :80). Values are read from a `.env` file next to the compose file — see `backend/.env.example` for the variable names.

## Maintenance sweep

Expired links deactivate lazily on first visit after expiry; `POST /api/sweep` marks them proactively:

```bash
curl -X POST https://your-backend/api/sweep -H "x-sweep-token: $SWEEP_TOKEN"
```

Set `SWEEP_TOKEN` to require the header, and `ANALYTICS_RETENTION_DAYS` (e.g. `30`) to also prune click telemetry older than that window. Point a cron job at it, e.g. every 15 minutes:

```
*/15 * * * * curl -fsS -X POST http://localhost:3000/api/sweep -H "x-sweep-token: ..." >/dev/null
```

## CI/CD (GitHub)

`.github/workflows/deploy.yml` runs on every push:

1. **Validate** — backend dependency install + syntax check, frontend production build. Runs for all pushes and PRs to `main`.
2. **Deploy** — on pushes to `main`, SSHes into your server, runs `git pull` and `docker compose up -d --build`. Only active once the repository secrets below exist; until then the job skips itself.

| Secret | Meaning |
|---|---|
| `SSH_HOST` | Server hostname or IP |
| `SSH_USER` | SSH user (needs Docker access) |
| `SSH_KEY` | Private SSH key (OpenSSH format) |
| `DEPLOY_PATH` | Optional — directory containing the repo clone (default `$HOME/vanish-link`) |

Add them under **Settings → Secrets and variables → Actions**. One-time server prep:

```bash
git clone https://github.com/Reaperrhs/vanish-link.git ~/vanish-link
cd ~/vanish-link
cp .env.example .env   # fill in — docker-compose interpolates from this file
docker compose up -d --build
```

The pipeline deploys the backend and frontend containers only; Appwrite itself is managed separately (self-hosted or cloud).

## Operational notes

- **Rate limiting** — `POST /api/shorten` allows 20 requests/IP/minute (in-memory, per process).
- **Redirect cache** — active standard links are cached in memory for 30s. Edits/deletes made directly through Appwrite (e.g. the dashboard) take effect when the TTL lapses.
- **Counter batching** — click/burn/generate counters are flushed to Appwrite every ~3 seconds, so dashboards may lag a click by a couple of seconds.
- **Proxy** — set `TRUST_PROXY=1` when running behind a reverse proxy so client IPs resolve correctly for rate limiting and telemetry.
- **Security** — there is no authentication; collections use public permissions. Only deploy on a trusted network, or front it with your own auth until an auth layer lands.

## One-off scripts

`backend/scripts/` contains setup and debug utilities (`initialize_appwrite.js`, `add_country_attribute.js`, and older test/verification scripts). They are not part of the runtime.
