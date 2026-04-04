# Prompt Skills Index

This folder contains Copilot prompt skills used by GPT-5.3-Codex in this repository.

## Available prompts

- `audit.prompt.md` - Security and compliance audit.
- `check.prompt.md` - Production build and validation checks.
- `migrate.prompt.md` - Prisma migration workflow with safety confirmations.
- `responsive.prompt.md` - Mobile responsiveness audit for pages/components.
- `review.prompt.md` - Pre-commit review of staged/unstaged changes.
- `test.prompt.md` - Backend integration test execution and failure triage.
- `ui-ux.prompt.md` - UI/UX planning and implementation workflow.
- `router-smoke-test.prompt.md` - Verifies routing intent-to-prompt mapping.

## Automatic routing

Prompt auto-selection rules live in:
- `.github/copilot-instructions.md` under `## Automatic prompt routing`

Priority when multiple intents match:
1. `migrate`
2. `audit`
3. `review`
4. `check`
5. `test`
6. `responsive`
7. `ui-ux`

## Quick validation

Ask Copilot to run `router-smoke-test` to verify mappings after editing routing rules.
