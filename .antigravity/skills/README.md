# Antigravity Skills Index

This folder contains **Antigravity AI skills** for the TUGON project.
Skills are loaded automatically by Antigravity and invoked when their descriptions match the current task.

## Available Skills

| Skill | Trigger Scenarios | Description |
|-------|-------------------|-------------|
| `audit` | "audit security", "check auth", "review RBAC", "before release" | Security & compliance audit of JWT, RBAC, geofencing, and data handling |
| `check` | "check build", "validate build", "does it compile", "before commit" | Full production build validation — frontend, backend, and Prisma |
| `migrate` | "create migration", "deploy migration", "prisma migrate", "schema change" | Safe Prisma migration workflow with confirmation gates |
| `responsive` | "mobile audit", "check responsiveness", "bottom nav", "citizen view layout" | Mobile responsiveness audit for any page or component |
| `review` | "review changes", "pre-commit review", "check my changes" | Pre-commit review against TUGON hard rules and design tokens |
| `test` | "run tests", "integration tests", "does the backend work" | Backend integration test execution and failure triage |
| `ui-ux-pro-max` | "design", "UI", "UX", "layout", "styling", "component", "page" | Full UI/UX design system with 67 styles, 96 palettes, TUGON tokens |

## Skill Format

Each skill folder contains a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: skill-name
description: When Antigravity should load this skill (used for routing)
---
```

## Prompt Routing Priority

When multiple skills match, Antigravity applies this priority:

1. `migrate` — schema changes are highest risk
2. `audit` — security findings are critical
3. `review` — pre-commit catch-all
4. `check` — build validation
5. `test` — backend correctness
6. `responsive` — mobile layout
7. `ui-ux-pro-max` — design and styling

## Related Skill Systems

- **GitHub Copilot prompts**: `.github/prompts/` (`.prompt.md` files)
- **Claude skills**: `.claude/skills/` (`SKILL.md` folders)
- **Antigravity skills**: `.antigravity/skills/` ← **this folder**

All three systems share the same underlying skill logic; the format differs per agent.
