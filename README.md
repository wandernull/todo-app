# todo-app

A full-stack todo list app running entirely on Cloudflare's edge infrastructure.

## Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | [Cloudflare Workers](https://workers.cloudflare.com/) | Serverless edge functions — runs close to users globally, no servers to manage |
| Framework | [Hono](https://hono.dev/) | Lightweight Express-like framework built for edge runtimes. Handles routing and request/response |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) | SQLite at the edge, managed by Cloudflare. Colocated with the Worker for low-latency queries |
| UI | Vanilla HTML/CSS/JS | Served directly from the Worker — no build step, no frontend framework |
| CI/CD | GitHub Actions + [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | Push to `main` → GitHub Actions runs `wrangler deploy` → live in seconds |

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Serves the HTML UI |
| `GET` | `/api/todos` | List all todos |
| `POST` | `/api/todos` | Create a todo `{ text: string }` |
| `PATCH` | `/api/todos/:id` | Toggle done/undone |
| `DELETE` | `/api/todos/:id` | Delete a todo |

## Local development

```bash
npm install
npm run db:migrate:local   # seed the local D1 emulator
npm run dev                # http://localhost:8787
```

Wrangler runs a local SQLite emulator via [Miniflare](https://miniflare.dev/) — no Cloudflare account needed for local dev. Local and production databases are completely separate.

## Deploy

Deployments are automatic: any push to `main` triggers the GitHub Actions workflow.

To deploy manually:
```bash
npm run deploy
```

Requires `CLOUDFLARE_API_TOKEN` to be set in your environment (or as a GitHub Actions secret for CI).

## Database migrations

```bash
npm run db:migrate:local   # apply migration to local emulator
npm run db:migrate:prod    # apply migration to production D1
```

Migrations live in `migrations/` as plain SQL files.
