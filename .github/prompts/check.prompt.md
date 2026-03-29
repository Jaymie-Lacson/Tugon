---
mode: "agent"
tools: ["terminal"]
description: "Run full production validation (Prisma validate/generate, backend build, frontend build)."
---
Run the production validation pipeline for TUGON in this order:
1. `npm --prefix server run prisma:validate`
2. `npm --prefix server run prisma:generate`
3. `npm run build:server`
4. `npm run build`

Output requirements:
- Report pass or fail per step
- On failure, stop and show concise actionable error summary
- Do not auto-fix errors unless requested
