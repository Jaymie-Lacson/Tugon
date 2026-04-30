# AGENTS.md

> Also read **ANTIGRAVITY.md** (project root) for the full Antigravity AI agent execution protocol, architecture map, and feature implementation guide.

This repository is for **TUGON**, a web-based incident management and geospatial decision-support system for Barangays 251, 252, and 256 in Tondo, Manila.

## Hard rules
- Web app only; do not convert to native mobile.
- Three roles: Citizen, Barangay Official, Super Admin.
- Keep citizen flow: Register -> Phone OTP -> Create Password -> Dashboard -> Report Incident -> Track Report.
- Keep citizen modules: Report Submitting, My Reports, Community Map, Profile Settings.
- Incident form is step-by-step.
- Incident types: Pollution, Noise, Crime, Road Hazard, Other.
- Evidence types: Photo and voice recording.
- Ticket statuses: Submitted, Under Review, In Progress, Resolved, Closed, Unresolvable.
- Geofencing routes incidents only to the owning barangay.
- Cross-border alerts notify neighboring barangays but do not grant action permissions.
- Heatmaps are for officials only and appear only after threshold-based clustering.
- The system augments and does not replace the official blotter.

## Development rules
- Read affected files before editing.
- Prefer minimal, reviewable changes.
- Do not rename existing identifiers without strong reason.
- Preserve responsive behavior.
- Preserve role-based access control and server-side validation.
- Keep solutions defendable for an academic capstone.

## Full detail

See [ANTIGRAVITY.md](../ANTIGRAVITY.md) for the complete execution protocol, architecture map, coding rules, and prompt routing guide.
