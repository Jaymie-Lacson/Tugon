# TUGON Repository Instructions

Always read this file before generating code for this repository.
Always read AGENTS.md and ARCHITECTURE.md before generating code for this repository.

## Project identity
This repository contains the capstone project:

**TUGON: A Web-Based Incident Management and Decision Support System using Geospatial Analytics**

TUGON is a web-based incident reporting and barangay decision-support platform for a tri-barangay cluster in Tondo, Manila:
- Barangay 251
- Barangay 252
- Barangay 256

The system is designed to augment, not replace, the traditional manual police/barangay blotter.

## Core functional rules
Always preserve these project rules when suggesting, generating, or refactoring code:

1. **Web app only**
   - This project is a browser-based web system.
   - Do not convert it into a native mobile app.
   - All features must remain responsive on desktop and mobile browsers.

2. **Three user roles**
   - Citizen / Resident
   - Barangay Official
   - Super Admin

3. **Citizen registration flow**
   - Home
   - Register
   - Phone OTP Verification
   - Create account / password
   - Home Dashboard
   - Report Incident
   - Track Report

4. **Citizen dashboard modules**
   - Report Submitting
   - My Reports
   - Community Map
   - Profile Settings

5. **Incident reporting flow**
   Use a step-by-step form, not a single long form.

   Required fields:
   - Incident Type:
     - Fire
     - Pollution
     - Noise
     - Crime
     - Road Hazard
     - Other
   - Location via map pin drop
   - Description text box
   - Evidence upload:
     - Photo
     - Voice recording

6. **Barangay restriction**
   - A citizen’s barangay is set during registration.
   - Reporting must respect that registration context.
   - Do not generate logic that lets users freely impersonate or switch barangays without explicit admin functionality.

7. **Ticket lifecycle**
   Preserve these statuses exactly unless explicitly asked to revise:
   - Submitted
   - Under Review
   - In Progress
   - Resolved
   - Closed
   - Unresolvable

8. **Geofencing**
   - Coordinate-based geofencing determines jurisdiction.
   - Tickets must be routed only to the barangay that owns the pinned location.
   - Neighboring barangays may receive cross-border alerts for nearby incidents.
   - Neighboring barangays must not be allowed to take action on incidents outside their jurisdiction.

9. **Heatmap behavior**
   - Heatmaps are for officials only.
   - Heatmaps should appear only when a threshold of similar incidents is reached in an area.
   - Do not treat heatmaps as simple pin visualization.

10. **Legal and governance rule**
   - The system augments traditional reporting workflows.
   - It must not be described or coded as a legal replacement for the official blotter.

## UX and design language
When generating frontend code, preserve this design direction:

- Typography: Roboto family
- Primary color: Dark Blue `#1E3A8A`
- Alert/action color: Red `#B91C1C`
- Secondary analytics/warning color: Ochre/Gold `#B4730A`

Design style:
- Modern government / civic technology dashboard
- Professional, clean, structured
- Responsive on mobile and desktop
- Information-rich but organized
- Use clear status badges, cards, tables, and map panels

Mobile navigation preference:
- Bottom navigation for citizen mobile views where appropriate

Homepage sections:
- Hero: “EMPOWERING TONDO WITH INSTANT TUGON.”
- Report Incident
- Track Status
- View Community Map
- How to use TUGON
- Supported Barangays
- Safety Tips
- Emergency Hotlines in the Philippines

## Engineering expectations
When making changes:
- Understand the relevant files before editing.
- Explain the plan briefly before large edits.
- Prefer small, reviewable changes over broad rewrites.
- Preserve existing working behavior unless a change request explicitly says otherwise.
- Do not rename variables, functions, routes, or files unnecessarily.
- Keep code modular and easy to defend in an academic capstone.
- Add comments only where they increase clarity.
- Avoid introducing unnecessary dependencies.
- Avoid placeholder logic if production-ready logic can be written from the existing context.
- If assumptions are required, state them clearly in chat before making risky architectural changes.

Database hosting for this project uses Supabase (PostgreSQL).
- When generating database code, assume Supabase connection strings and compatibility with PostgreSQL.

## Backend expectations
- Keep role-based access control strict.
- Validate incident ownership, status transitions, and barangay jurisdiction on the server side.
- Never rely only on frontend validation for permissions.
- Preserve auditability for ticket updates where possible.

## Database expectations
When generating schema or migrations, support:
- users
- roles
- citizen profiles
- barangays
- incidents
- incident evidence
- ticket status history
- cross-border alerts
- geospatial or coordinate fields
- heatmap aggregation support if needed

## Mapping expectations
- Treat the map as a core feature, not decoration.
- Preserve barangay boundary logic.
- Distinguish clearly between:
  - incident pins
  - official heatmap visualization
  - routing / geofencing logic
  - cross-border alert logic

## Academic project expectations
This is an IT capstone project, so generated solutions should be:
- technically sound
- academically defendable
- realistic for implementation
- aligned with Chapter 1, Statement of the Problem, and Scope and Limitations

Avoid overengineering beyond the capstone scope.

## Output style for coding tasks
For every non-trivial coding request:
1. Summarize what you understood.
2. List the files likely affected.
3. Propose the smallest safe implementation plan.
4. Then generate or edit code.
5. Mention any assumptions or follow-up checks.

## Output style for debugging tasks
When debugging:
1. Identify likely root causes first.
2. Prioritize the fix with the highest probability.
3. Suggest exact files/lines to inspect.
4. Only then propose code changes.
