---
name: migrate
description: Create or apply a Prisma database migration safely. Pass a migration name to create, or "deploy" to apply pending migrations. Use when changing the database schema.
---

# Prisma Migration

Manage Prisma migrations for the TUGON database.

## Usage

- `migrate status` — show current migration status
- `migrate deploy` — apply all pending migrations
- `migrate <name>` — create a new migration with the given name

## Steps

### If argument is "status"
1. Run `npm --prefix server run prisma:status` and report the result.

### If argument is "deploy"
1. Run `npm --prefix server run prisma:status` first to show what will be applied.
2. Ask the user to confirm before proceeding.
3. Run `npm --prefix server run prisma:migrate:deploy`.
4. Run `npm --prefix server run prisma:generate` to update the client.
5. Report success or failure.

### If argument is a migration name
1. Run `npm --prefix server run prisma:validate` to ensure the schema is valid before migrating.
2. Show the user a diff of `server/prisma/schema.prisma` so they can verify the changes.
3. Ask the user to confirm before proceeding.
4. Run `npm --prefix server run prisma:migrate -- --name <migration-name>`.
5. Run `npm --prefix server run prisma:generate` to update the client.
6. Report the migration result and remind the user to test.

## Rules

- ALWAYS validate the schema before creating a migration.
- ALWAYS ask for user confirmation before running migrate or deploy.
- NEVER run migrations with `--skip-seed` or `--skip-generate`.
- If migration fails, show the full error and suggest a fix — do NOT retry automatically.
- Remind the user that `DATABASE_URL` must be set in `server/.env`.
