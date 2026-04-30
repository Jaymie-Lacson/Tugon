---
agent: "agent"
tools: ["codebase", "runCommands"]
description: "Pre-commit review of staged and unstaged changes against TUGON rules and quality checks."
---
Perform a pre-commit review of current changes.

Required checks:
- Hard rules in AGENTS.md and copilot-instructions.md
- Role, status, and incident-type invariants
- Geofencing and cross-border permission constraints
- Design tokens and responsive behavior
- Service contract signature stability
- Security and code quality risks

Output requirements:
- Findings first, ordered by severity
- Include file references for each finding
- Explicitly state if no findings are present
