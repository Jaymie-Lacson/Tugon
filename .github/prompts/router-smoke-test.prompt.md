---
mode: "agent"
tools: ["codebase"]
description: "Validate automatic prompt routing by matching user intents to the expected prompt file."
---
Run a routing smoke test for this repository's automatic prompt routing rules.

Task:
- Given each sample user request below, identify which prompt should be auto-selected.
- Return a table with columns: `Sample Request`, `Expected Prompt`, `Reason`.
- If two prompts could match, apply the configured priority order from `.github/copilot-instructions.md`.

Samples:
1. "Run a security audit for OTP and JWT routes."
2. "Create a Prisma migration for adding incident severity."
3. "Check if current branch builds for production."
4. "Review my staged changes before I commit."
5. "Run backend integration tests for auth sessions."
6. "My dashboard page is broken on iPhone width."
7. "Redesign the citizen home page layout and polish visual hierarchy."
8. "Deploy pending Prisma migrations and generate client."
9. "Audit responsive issues and also run a code review."
10. "No specific request, just answer a normal coding question."

Expected mapping source of truth:
- `.github/copilot-instructions.md` -> `## Automatic prompt routing`
- `.github/prompts/*.prompt.md`

Output constraints:
- Do not modify files.
- Keep explanations concise.
