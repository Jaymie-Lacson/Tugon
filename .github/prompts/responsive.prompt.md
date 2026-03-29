---
agent: "agent"
tools: ["codebase"]
description: "Audit a page/component for mobile responsiveness and TUGON citizen UX constraints."
---
Audit the target component/page for mobile responsiveness.

Checklist:
- Breakpoint behavior and no horizontal overflow
- Touch target size at least 44x44px
- Citizen bottom navigation usability on mobile views
- Readable typography and spacing on 375px to 428px widths
- Map/container behavior if map is present
- Compliance with TUGON design tokens and Roboto usage

Output requirements:
- Findings first with file references and exact class/CSS issues
- Provide minimal patch suggestions
- If no issues, state that explicitly
