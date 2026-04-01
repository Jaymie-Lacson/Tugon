---
name: responsive
description: Audit a component or page for mobile responsiveness issues. Pass a component name or file path. Use when working on mobile layout, citizen views, or the bottom nav.
---

# Mobile Responsiveness Audit

Audit the specified component or page for mobile responsiveness compliance.

## Steps

1. **Find the target** — locate the file for the given argument. Search in `src/app/pages/` and `src/app/components/` if a bare name is given.
2. **Read the component** — read the full source file and any imported layout/wrapper components.
3. **Read related styles** — check for associated CSS in `src/styles/mobile.css`, `src/styles/index.css`, and any Tailwind classes used inline.
4. **Audit against TUGON mobile requirements:**

### Layout Checks
- [ ] Uses responsive Tailwind breakpoints (`sm:`, `md:`, `lg:`) or equivalent CSS media queries
- [ ] No fixed widths that break on small screens (< 375px)
- [ ] No horizontal overflow / scroll on mobile
- [ ] Touch targets are at least 44x44px
- [ ] Text is readable without zooming (min 14px / 0.875rem body text)

### Citizen Mobile Nav
- [ ] Citizen views use bottom navigation (not sidebar)
- [ ] Bottom nav items are reachable with thumb
- [ ] Active state is visually clear
- [ ] Nav does not overlap content

### Design Token Compliance
- [ ] Font: Roboto family
- [ ] Primary: `#1E3A8A`
- [ ] Alert: `#B91C1C`
- [ ] Analytics: `#B4730A`

### Map Components (if applicable)
- [ ] Map container is responsive (not fixed dimensions)
- [ ] Map controls are touch-friendly
- [ ] Popups/tooltips don't overflow viewport

5. **Report** — list any issues found with specific class names or CSS rules that need fixing, and suggest the minimal Tailwind/CSS changes needed.

## Rules

- Do NOT modify files — this is a read-only audit.
- If the component has no mobile issues, say so briefly.
- Focus on practical issues that affect real users on phones (375px–428px width range).
