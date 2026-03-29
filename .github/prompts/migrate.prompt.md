---
mode: "agent"
tools: ["terminal", "codebase"]
description: "Safely run Prisma migration status, deploy, or create migration with confirmations."
---
Manage Prisma migrations for TUGON safely.

Accepted input:
- `status`
- `deploy`
- `<migration-name>`

Behavior:
- For `status`: run `npm --prefix server run prisma:status`
- For `deploy`: run status first, ask for confirmation, then run deploy and generate
- For `<migration-name>`: validate schema first, show schema diff, ask for confirmation, then create migration and generate

Rules:
- Always require explicit confirmation before deploy or creating migration
- Never skip validation/generate
- If failure occurs, report full error and recommended next step
