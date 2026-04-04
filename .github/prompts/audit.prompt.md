---
agent: "agent"
tools: ["codebase", "runCommands"]
description: "Security and compliance audit for TUGON auth, RBAC, geofencing, and data handling."
---
Run a focused security and compliance audit for TUGON.

Scope:
- JWT + OTP authentication checks
- RBAC enforcement on server routes
- Server-side geofencing and cross-border restrictions
- Upload validation and privacy protections
- Regression checks for known security hardening items

Output requirements:
- Findings first, ordered by severity
- Include file references for each finding
- Mark each check as Implemented, Partial, Missing, or Regressed
- End with top 3 remediation actions

Rules:
- Do not modify files unless explicitly requested
- Keep recommendations aligned with AGENTS.md and ARCHITECTURE.md
