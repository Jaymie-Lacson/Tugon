---
agent: "agent"
tools: ["runCommands", "codebase"]
description: "Run backend integration tests and summarize failures with likely causes."
---
Run TUGON integration tests using Node's test runner via npm scripts.

Behavior:
- If no argument is provided, run all integration tests: `npm --prefix server run test:integration`
- If a specific test file is provided, run that target if supported by script pattern

Output requirements:
- Report pass or fail summary
- For failures, include failing test names and likely root cause
- Reference relevant source files to inspect next
- Do not modify code unless explicitly requested
