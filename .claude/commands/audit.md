Run the `audit` skill from `.claude/skills/audit/SKILL.md`.

If the user provides a scope, focus the audit on that module first, then include project-wide high-risk checks:
- JWT and OTP security
- RBAC enforcement (server-side)
- Geofencing and cross-border permission boundaries
- Upload validation and privacy handling
- Regression checks for known security gaps

Output findings ordered by severity, with file references and concrete remediation steps.
