Run the `check` skill from `.claude/skills/check/SKILL.md`.

Execute the full production validation pipeline and report only concise results:
1. `npm --prefix server run prisma:validate`
2. `npm --prefix server run prisma:generate`
3. `npm run build:server`
4. `npm run build`

If any step fails, stop at the failing point and include the actionable error summary.
