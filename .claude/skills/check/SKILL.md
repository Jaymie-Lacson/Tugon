---
name: check
description: Run full production build validation — frontend, backend, and Prisma. Use after making changes to verify nothing is broken before committing.
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read, Grep
---

# Production Build Check

Run the full TUGON production validation pipeline and report results.

## Steps

1. **Prisma validation** — run `npm --prefix server run prisma:validate` to ensure the schema is valid.
2. **Prisma generate** — run `npm --prefix server run prisma:generate` to ensure the client is up to date.
3. **Backend build** — run `npm run build:server` and capture any TypeScript errors.
4. **Frontend build** — run `npm run build` and capture any TypeScript/Vite errors.
5. **Summary** — report pass/fail for each step. If any step fails, show the relevant error output and suggest a fix.

## Rules

- Run each step sequentially (later steps depend on earlier ones).
- Do NOT fix errors automatically — only report them and suggest what to do.
- If Prisma validation fails, skip the remaining steps and report immediately.
- Keep output concise: show only errors, not full success logs.
