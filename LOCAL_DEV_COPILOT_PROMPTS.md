# TUGON Local Development Copilot Prompt Pack

Use these prompts directly in Copilot Chat to help a co-developer run the system locally.

## Prompt 1: Workspace Bootstrap

```text
Open this folder as a VS Code workspace and set up TUGON for local development.

Do these in order:
1) Install dependencies in root and server
2) Copy .env.example to .env
3) Copy server/.env.example to server/.env
4) Show me what values I must fill manually before running

Use terminal commands and explain each step briefly.
```

## Prompt 2: Fill Local Env Safely

```text
Help me complete the minimum required local env for TUGON.
Use these rules:
- Keep OTP in mock mode
- Keep bearer auth disabled
- Keep CSRF defaults
- Use localhost origins
- Do not enable production-only settings

Then output a checklist of required keys and which are optional for local-only testing.
```

## Prompt 3: Database Setup (First Run)

```text
Set up the database for first local run.

Run:
1) Prisma generate
2) Apply existing migrations
3) (Optional) Seed demo data if available

Then confirm success and list any errors with exact fixes.
```

## Prompt 4: Run Backend

```text
Start the backend server for TUGON and verify it is healthy.
Use the correct command from this repo (do not use 'npm server run dev').
After starting, test the health endpoint and show status.
```

## Prompt 5: Run Frontend

```text
Start the frontend Vite dev server and verify API proxy is working to localhost:4000.
Then open the app URL and confirm expected local URLs for frontend and backend.
```

## Prompt 6: Quick Local Smoke Test

```text
Run a quick local smoke test for auth/report flow:
- Check backend health endpoint
- Attempt register with mock OTP flow expectations
- Confirm frontend can reach /api without CORS issues

If anything fails, give me the smallest fix first.
```

## Prompt 7: One-Command Sanity Check

```text
Run the production sanity checks for this repo and summarize:
- frontend build
- backend build
- prisma validate
- prisma generate
- prisma migration status

Then tell me if local setup is ready for development.
```

## Prompt 8: Command Typo Guard

```text
I got a command error. Validate my commands against this repo scripts and correct them.
Example typo to catch: 'npm server run dev' should be fixed to the proper server command.
```

## Minimum Env Values To Fill

### `server/.env` (preferred) or root `.env`

Required:
- `JWT_SECRET` (must be at least 16 characters)
- `DATABASE_URL` (reachable PostgreSQL connection string)

Recommended local-safe values:
- `OTP_DELIVERY_MODE=mock`
- `AUTH_RETURN_TOKEN_IN_BODY=0`
- `AUTH_ALLOW_BEARER_TOKENS=0`
- `CSRF_COOKIE_NAME=tugon.csrf`
- `CSRF_HEADER_NAME=x-csrf-token`
- `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`

### Root `.env`

Use:
- `VITE_API_BASE_URL=/api`
- `VITE_ENABLE_BEARER_AUTH=0`
- `VITE_CSRF_COOKIE_NAME=tugon.csrf`
- `VITE_CSRF_HEADER_NAME=x-csrf-token`

## Command Reference

Install dependencies:
```bash
npm install
npm --prefix server install
```

Run development servers:
```bash
npm run dev
npm --prefix server run dev
```

Prisma commands:
```bash
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate:deploy
npm --prefix server run seed
```

Production sanity check:
```bash
npm run check:prod
```

## Notes

- If both root `.env` and `server/.env` exist, server loads `server/.env` first and can fall back to root `.env`.
- Frontend local proxy in `vite.config.ts` forwards `/api` to `http://localhost:4000`.
- For local dev, keep OTP in mock mode unless a real SMS provider is intentionally configured.
