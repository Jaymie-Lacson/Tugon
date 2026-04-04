---
name: review
description: Pre-commit review of staged/unstaged changes against TUGON hard rules, design tokens, and coding standards. Use before committing to catch violations early.
---

# Pre-Commit Review

Review all current changes (staged + unstaged) against TUGON project rules before committing.

## Steps

1. **Gather changes** — run `git diff` and `git diff --cached` to see all modifications. Also run `git status` to see new/deleted files.
2. **Read changed files** — read the full content of each modified file to understand context.
3. **Check against hard rules** — verify none of the following are violated:

### Hard Rules Checklist
- [ ] No native mobile conversion (web-only, browser-responsive)
- [ ] Three roles preserved: Citizen, Barangay Official, Super Admin
- [ ] Ticket statuses unchanged: Submitted, Under Review, In Progress, Resolved, Closed, Unresolvable
- [ ] Incident types unchanged: Pollution, Noise, Crime, Road Hazard, Other
- [ ] Incident form remains step-by-step (type, location, description, evidence, review)
- [ ] Evidence limited to photo and voice recording
- [ ] Geofencing remains server-side (no frontend-only boundary checks)
- [ ] Cross-border alerts are informational only
- [ ] Heatmaps are officials-only and threshold-gated
- [ ] Barangay assignment not freely switchable
- [ ] Status changes validated server-side with status_history records
- [ ] RBAC is server-side (no frontend-only permission checks)

### Design Token Checklist
- [ ] Font family: Roboto
- [ ] Primary color: `#1E3A8A` (dark blue)
- [ ] Alert color: `#B91C1C` (red)
- [ ] Analytics color: `#B4730A` (ochre/gold)
- [ ] Mobile nav: bottom navigation for citizen views

### Code Quality Checklist
- [ ] No unnecessary renames of variables, functions, routes, or files
- [ ] No features or refactoring beyond what was asked
- [ ] No error handling for impossible scenarios
- [ ] No new unnecessary dependencies
- [ ] Existing working behavior preserved
- [ ] No security vulnerabilities (XSS, injection, etc.)

### Service Contract Checklist
- [ ] `resolveBarangayFromCoordinates` signature intact
- [ ] `isWithinBarangayBoundary` signature intact
- [ ] `findNeighborBarangays` signature intact
- [ ] `isNearBoundary` signature intact
- [ ] `generateHeatmapData` signature intact

4. **Report** — for each checklist, report PASS or list specific violations with file:line references and a suggested fix.

## Rules

- Do NOT make any changes — this is a read-only review.
- Be specific: cite exact file paths and line numbers for any violation.
- If changes look clean, say so briefly. Don't pad the output.
