# Session Handoff — 2026-03-29 (UI/UX Redesign, Session 6)

**Branch:** `redesign`
**Build status:** PASSING ✓ — verified after SABarangayMap migration.
**All changes committed** — no unstaged source file changes.

---

## What was accomplished this session

### Phase 5: SABarangayMap.tsx migration (complete)

Migrated `SABarangayMap.tsx` from inline `style={{}}` to Tailwind:
- **149 inline styles → 33 remaining** (all 33 are legitimately kept inline: map overlay positions, Leaflet-required `MapContainer style={}`, `gridTemplateColumns: '1fr 296px'`, and all dynamic runtime colors/values)
- `ZoomController` buttons → Tailwind
- All toolbar, filter pills, barangay filter labels → Tailwind
- Error banners, page header, action buttons → Tailwind
- Heatmap settings panel inner content → Tailwind (kept `position/top/right/zIndex/width` inline)
- Map legend overlay inner content → Tailwind (kept `position/bottom/left/zIndex` inline)
- OSM attribution → Tailwind (kept `position/bottom/right/zIndex` inline)
- Side panel, barangay detail card, incidents list, quick buttons → Tailwind
- Comparison table (header, rows, cells) → Tailwind
- `<style>` block preserved (`@keyframes sa-ping` + `sa-map-*` media queries)
- `makeIcon()` DivIcon HTML string untouched
- All `pathOptions` on Polygon/Circle untouched

### IncidentReport.tsx — fully read, NOT yet migrated

Read all 2,658 lines in 5 passes. Fully understood structure. Ready to migrate next session without re-reading.

---

## Current state

### Working (confirmed with `npm run build`)
- `SABarangayMap.tsx` ✓
- All previously migrated files still working (Phases 1–4, Phase 5 partial)

### Not started yet (Phase 5 remaining — 1 file)
- `IncidentReport.tsx` — 210 inline styles, 2,658 lines. **FULLY READ this session.** Ready to migrate next session.

---

## Files modified

| File | Summary |
|------|---------|
| `src/app/pages/superadmin/SABarangayMap.tsx` | 149 inline styles → 33 remaining; full Tailwind migration |

---

## Open decisions

- `gridTemplateColumns: '1fr 296px'` in SABarangayMap — kept inline (no Tailwind equivalent). Correct call.
- `gridTemplateColumns: '1fr 1fr'` in IncidentReport Step1 category grid → **can** replace with `grid-cols-2` Tailwind class (it's static).
- `gridTemplateColumns: 'repeat(4, 1fr)'` in Step1 severity + Step3 affected count → **can** replace with `grid-cols-4`.
- `onFocus`/`onBlur` direct DOM style mutations (`e.target.style.borderColor = ...`) in Step2 address input and Step3 textarea — these are NOT React `style={}` props. **Do NOT remove these handlers.** The textarea/input borders are statically set in the style prop and the handlers override them on interaction.

---

## Traps to avoid

### IncidentReport.tsx — critical items to keep untouched or inline:

**Leaflet — keep absolutely untouched:**
- `MapContainer style={{ display: 'block', height, width: '100%' }}` (line ~646) — Leaflet required, `height` is a variable passed from caller
- `pathOptions` on `Polygon` and `CircleMarker` — Leaflet props, not HTML styles

**`<style>` blocks — keep ALL of them:**
- Step4: `@keyframes wave-bar` and `@keyframes blink` (used by waveform bars and recording dot)
- Step3: `@media (max-width: 520px) { .incident-affected-grid }` responsive override
- SuccessScreen: `@keyframes successPop`
- SubmissionLoadingOverlay: `@keyframes incidentSubmitSpin`
- Main export footer: `@media` queries for `.citizen-report-footer` (fixed vs sticky positioning)
- Main export content: `.citizen-report-content-wrap` max-width override

**Keep inline (position overlays):**
- Step2 expanded map modal: `position: 'fixed', inset: 0, zIndex: 250` + flex column
- Step2 "Expand Map" button: `position: 'absolute', top: 10, right: 10, zIndex: 11`
- Step2 map hint: `position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)'`
- Step4 photo preview overlay: `position: 'fixed', inset: 0, zIndex: 260`
- Step5 photo preview overlay (identical): `position: 'fixed', inset: 0, zIndex: 260`
- Step4 photo remove button: `position: 'absolute', top: 4, right: 4`
- Step4 photo number badge: `position: 'absolute', bottom: 4, left: 4`
- Step5 photo thumbnail gradient overlay: `position: 'absolute', inset: 0`
- Step5 photo thumbnail number badge: `position: 'absolute', bottom: 3, right: 3`
- SuccessScreen outer: `position: 'fixed', inset: 0, zIndex: 300`
- SuccessScreen bg decoration divs: `position: 'absolute'` with top/right/bottom/left
- SuccessScreen inner content: `position: 'relative', zIndex: 1`
- SubmissionLoadingOverlay: `position: 'fixed', inset: 0, zIndex: 290`
- Spinner span: `position: 'absolute', inset: -6`
- StepIndicator outer div: `position: 'sticky', top: 60, zIndex: 40` — keep these inline, rest can be Tailwind
- Header: `position: 'sticky', top: 0, zIndex: 50` — keep inline
- Header inner: `position: 'relative'` — keep inline
- Profile menu dropdown: `position: 'absolute', top: 44, right: 0, zIndex: 110`

**Keep inline (dynamic runtime values):**
- Category card buttons: `background: sel ? color : '#fff'`, `border: 2px solid ${sel ? color : '#E8EEF4'}` — `color` comes from CATEGORIES array at runtime
- Category card unselected bg pattern div: `background: bg` (from CATEGORIES)
- Category card icon div: `background: sel ? 'rgba(255,255,255,0.22)' : bg`, `color: sel ? '#fff' : color`
- Category card label/desc: conditional `sel` colors
- Severity buttons: `border: 2px solid ${sel ? s.color : s.border}`, `background: sel ? s.bg : '#fff'`, `boxShadow: sel ? 0 2px 10px ${s.color}30 : none`
- Quick tag buttons: `border: 1.5px solid ${added ? '#1E3A8A' : '#E2E8F0'}`, `background/color` conditional
- Affected count buttons: `border: 2px solid ${sel ? '#1E3A8A' : '#E2E8F0'}`, `background: sel ? ...`, label/sublabel colors conditional
- Textarea dynamic border: set via `onFocus`/`onBlur` imperative handlers — do NOT remove handlers
- Address input: same — `onFocus`/`onBlur` imperative handlers
- Step2 map shell: `border: 2px solid ${form.pin ? '#3B82F6' : '#E2E8F0'}`, `boxShadow` dynamic
- Step2 "Use My Registered Location" button: `opacity: !hasBarangayProfile ? 0.6 : 1`
- Step3 char counter span: `color: charColor` (computed from description length)
- Waveform bars (Step4): `height` (Math formula), `animation` with computed duration, `animationDelay`, `opacity` (Math formula) — ALL keep inline
- Recording dot: `animation: blink 1s step-start infinite` inline (references @keyframes)
- Step5 summary card header: `background: linear-gradient(135deg, ${cat.color}14, ...)`, `borderBottom: 3px solid ${cat?.color}`
- Step5 icon box: `background: cat?.bg`, `color: cat?.color`, `boxShadow: 0 2px 8px ${cat?.color}20`
- Step5 severity pill: all bg/color values dynamic based on `form.severity`
- Step5 detail row icon div: `background: ${accent}14`, `color: accent`
- Step5 detail row: `borderBottom: idx < arr.length - 1 ? '1px solid #F8FAFC' : 'none'`
- Footer "Continue/Submit" button: `background`, `color`, `cursor`, `flex`, `boxShadow` all dynamic

**Photo add button onMouseOver/onMouseOut (Step4, lines ~1337-1344):**
- These are imperative DOM mutations on `e.currentTarget.style` — keep both handlers. Do not remove.

---

## Next steps (priority order)

1. **IncidentReport.tsx** — migrate 210 inline styles → Tailwind. **File fully read — start immediately without re-reading.**
   - Work section by section top to bottom:
     1. `StepIndicator` sub-component (lines ~288–347)
     2. `Step1` — category cards (dynamic inline), severity row (dynamic inline), subcategory section (lines ~352–520)
     3. `Step1WithValidation` error banner (lines ~522–551)
     4. `Step2` — header text, map shell dynamic border inline, expanded map overlay inline, pin chip, address label, error banners (lines ~686–954)
     5. `Step3` — tip box, textarea wrapper (dynamic border via handlers), quick tags (dynamic inline), affected count grid (lines ~989–1136)
     6. `Step4` — photo card, voice recorder, playback UI, waveform bars (all dynamic inline), photo preview overlay (lines ~1232–1597)
     7. `Step5` — summary card (dynamic header/icon inline), photo thumbnails, legal disclaimer, photo preview overlay (lines ~1678–1875)
     8. `SuccessScreen` (lines ~1900–2016)
     9. `SubmissionLoadingOverlay` (lines ~2018–2083)
     10. Main `IncidentReport` export — header, profile button (static, can migrate), profile menu, footer nav buttons (dynamic inline) (lines ~2359–2657)
   - **Use full file rewrite** (same approach as SABarangayMap)

2. **Wire BottomNav** into `CitizenPageLayout` for citizen mobile nav.
3. **Wire CitizenOnboardingModal** into citizen layout.
4. **Phase 6**: Landing.tsx, map-view.css token unification, mobile.css dead selector cleanup, final audit.

---

## Relevant file paths

- `CLAUDE.md` — Project rules and constraints
- `AGENTS.md` / `ARCHITECTURE.md` — Detailed architecture reference
- `design-analysis-plan.md` — Full page-by-page breakdown and component inventory
- `src/styles/theme.css` — Design tokens (updated in Phase 0)
- `src/app/components/CitizenPageLayout.tsx` — Citizen layout; `<style>` block defines `citizen-*` classes
- `src/app/components/BottomNav.tsx` — Shared bottom nav (Phase 1, updated Phase 3) — not yet wired
- `src/app/components/CitizenOnboardingModal.tsx` — Built in Phase 1, not yet wired
- `src/app/pages/superadmin/SABarangayMap.tsx` — Migrated this session ✓
- `src/app/pages/IncidentReport.tsx` — **NEXT TARGET** (210 inline styles, 2,658 lines, fully read)
