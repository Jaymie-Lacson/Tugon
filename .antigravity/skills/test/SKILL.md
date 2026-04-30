---
name: test
description: Run server integration tests. Optionally pass a test file name to run a specific test. Use after backend changes to verify correctness.
---

# Run Integration Tests

Run the TUGON server integration test suite.

## Steps

1. **Identify tests** — if an argument is provided, find the matching test file in `server/tests/`. If not provided, run all tests.
2. **Run tests** — execute `npm --prefix server run test:integration` (or the specific file if provided).
3. **Report results** — show pass/fail counts and any failure details.

## Rules

- Tests use Node's built-in `node:test` runner — NOT Jest or Vitest.
- Test files live in `server/tests/` with the pattern `*.test.ts` or `*.integration.test.ts`.
- If a test fails, read the failing test file and the relevant source code to suggest what went wrong.
- Do NOT modify test files or source code — only report findings.
- If no tests exist for the area the user is working on, suggest creating one following the pattern in `server/tests/admin.integration.test.ts`.
