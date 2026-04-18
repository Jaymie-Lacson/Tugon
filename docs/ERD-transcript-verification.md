# ERD Verification Report — TUGON vs. Prof. Centeno's Requirements

> Generated: 2026-04-18
> Scope: Cross-reference of [docs/ERD.md](ERD.md) against the ERD lecture/meeting transcript by Prof. Centeno.
> Status after this pass: **R1, R2, R3, R5, R7, R10 fully satisfied** in Mermaid. **R4 (weak-entity shapes), R8, R9** require the draw.io redraw + printed submission.

---

## 1. Verdict at a glance

| # | Check | Result |
|---|-------|--------|
| R1 | Crow's Foot notation used (not Chen) | ✅ Matches |
| R2 | No data types on attributes | ✅ Fixed this pass (`attr` is a neutral Mermaid placeholder, not a SQL type) |
| R3 | Based on the latest database | ✅ Verified against `server/prisma/schema.prisma` |
| R4 | Weak entities marked (classical double-rectangle) | ⚠️ Not expressible in Mermaid — annotated in text (§5 & §6) |
| R5 | Derived attributes flagged | ✅ Fixed this pass — `"derived"` comment on 4 fields |
| R6 | Entity set, relationships, PK/FK/UK correct | ✅ Matches schema |
| R7 | Avoid M:N relationships | ✅ Zero M:N — all many-to-many pairs go through a linking entity |
| R8 | Printed **landscape on long bond paper**, **black & white** | ❌ External — see §6 |
| R9 | Submitted via the secretary on Apr 15 or Apr 22 (group poll) | ❌ External — see §6 |
| R10 | Business rules / CHECK constraints documented | ✅ §7 of ERD.md — `category` (5 values), `subcategory` (17 values) |

---

## 2. Rubric in detail

### R1 — Crow's Foot notation (not Chen)
Prof. Centeno required Crow's Foot over Chen because the TUGON schema has 13 entities and many attributes — Chen's oval-per-attribute layout does not scale. All four diagram sections in `ERD.md` use Mermaid `erDiagram`, which renders crow's-foot cardinality markers (`||`, `o|`, `o{`, `|{`).

### R2 — No data types on attributes
Prof. Centeno, around 39:45 of the recording: *"Ekis di niyo kailangan lagyan ng integer character."* (Don't put integer, character, etc.)

**Before this pass** — attributes looked like `text id PK`, `boolean isPhoneVerified`, `int photoCount`.
**After this pass** — every attribute line begins with the neutral token `attr`, e.g. `attr id PK`, `attr photoCount "derived"`. A note at the top of `ERD.md` explains that `attr` is a Mermaid-syntax requirement, not a real type, and that it must be **ignored** when the ERD is redrawn in draw.io.

### R3 — Latest database schema
Schema file: [`server/prisma/schema.prisma`](../server/prisma/schema.prisma). Entity list, column names, PK/FK/UK markers, and enum values were all cross-checked against the file on 2026-04-18. No drift detected.

### R4 — Weak entities (double rectangle + double diamond)
A **weak entity** cannot be uniquely identified by its own attributes alone — it inherits identity from a parent entity via an "identifying relationship". In TUGON:

| Weak entity | Parent | Why weak |
|-------------|--------|----------|
| `INCIDENT_EVIDENCE` | `CITIZEN_REPORT` | A photo/voice file is meaningless without the report it belongs to; `reportId` is part of its identity. |
| `TICKET_STATUS_HISTORY` | `CITIZEN_REPORT` | A status-change row only makes sense in the context of its parent ticket. |
| `CROSS_BORDER_ALERT` | `CITIZEN_REPORT` | An inter-barangay alert has no existence without the originating report. |

Mermaid `erDiagram` renders every entity as a single rectangle and has **no syntax for double rectangles or double-diamond identifying relationships**. This is called out explicitly in §5 (Notation Legend → Special markers) and §6 (Entity Summary → Strength column) of `ERD.md`, and must be drawn correctly in the draw.io submission.

### R5 — Derived attributes (dashed oval)
A derived attribute's value is **computed** from other stored data, not stored independently. Prof. Centeno required these to be flagged (dashed oval in classical notation).

| Attribute | Entity | Derived from |
|-----------|--------|--------------|
| `is_verified` / `isVerified` | `User` | `verification_status = APPROVED` |
| `hasPhotos` | `CitizenReport` | `COUNT(IncidentEvidence WHERE kind = 'photo') > 0` |
| `photoCount` | `CitizenReport` | `COUNT(IncidentEvidence WHERE kind = 'photo')` |
| `hasAudio` | `CitizenReport` | `COUNT(IncidentEvidence WHERE kind = 'voice') > 0` |

After this pass, each of these lines in the Mermaid blocks carries the `"derived"` comment token, and §5 of `ERD.md` lists them with their computation rules.

### R6 — Entity set & relationship correctness
13 entities (§6 of ERD.md), 12 enforced-FK relationships and 5 logical relationships. All cardinalities verified: see "Cardinality rules" callouts under §2, §3, and §4 of ERD.md.

### R7 — No M:N relationships
Many-to-many concepts are all resolved through linking entities:

| Logical many-to-many | Resolved via |
|----------------------|--------------|
| Users ↔ Barangays | Through `CITIZEN_PROFILE` / `OFFICIAL_PROFILE` (one barangay per profile — actually 1:N at the physical level) |
| Reports ↔ Barangays (cross-border) | Through `CROSS_BORDER_ALERT` (linking rows) |
| Reports ↔ Evidence files | `INCIDENT_EVIDENCE` is a 1:N child, not a junction |

No entity-to-entity `}o--o{` (zero-or-many to zero-or-many) edge appears in any of the four diagrams.

### R8 — Landscape, long bond paper, black & white
**External action — not a file edit.** When exporting the ERD for submission:
1. Render each `erDiagram` block at high resolution (Mermaid Live Editor → PNG/PDF at ≥2x scale, or redraw in draw.io).
2. Lay out on **long bond paper (8.5" × 13")** in **landscape** orientation.
3. Use **black & white** only — no colored highlights, no gradient fills.

### R9 — Submission via secretary, Apr 15 or Apr 22
**External action.** Hand the printed copy to your group secretary before the deadline voted by the group (the transcript mentioned a poll between April 15 and April 22, 2026).

### R10 — Business rules / CHECK constraints
§7 of ERD.md preserves the two DB-level CHECK constraints from the Prisma schema:
- `category` — one of 5 values (Pollution · Noise · Crime · Road Hazard · Other).
- `subcategory` — one of 17 values (full list in §7).

These enforce **Hard Rule #4** (incident types preserved exactly) at the database layer.

---

## 3. Changes applied this pass

1. **Stripped all SQL/primitive types** from every attribute line in all four `erDiagram` blocks (§1–§4). Replaced with the neutral token `attr`.
2. **Added `"derived"` comment** to 5 attribute lines across the Master ERD, Core Domain subsystem, and Incident Reporting subsystem: `User.is_verified`, `User.isVerified`, `CitizenReport.hasPhotos`, `CitizenReport.photoCount`, `CitizenReport.hasAudio`.
3. **Expanded the Notation Legend** (§5 of ERD.md) with a "Special markers used in the diagrams" table mapping Mermaid conventions → classical Chen/Crow's-Foot symbols for the draw.io redraw.
4. **Added a "Derived attribute sources" table** (§5) documenting the computation rule for each derived field.
5. **Added a Strength column** to the Entity Summary (§6) distinguishing the 3 weak entities from the 10 strong entities.
6. **Added a "Weak entities in this subsystem" note** at the bottom of §3 (Incident Reporting).
7. **Restructured the header notes** to explain the `attr` placeholder and the `"derived"` convention up-front.

---

## 4. What the ERD already got right (did not need changes)

- Crow's Foot cardinalities on every relationship.
- Zero M:N relationships — already resolved through linking entities.
- Matches the live Supabase schema as of 2026-04-18.
- All PKs, FKs, and UKs identified.
- Logical (non-FK) relationships distinguished from enforced FKs via dashed lines.
- CHECK constraints on `category` / `subcategory` documented.
- `_prisma_migrations` excluded as a framework-internal table.

---

## 5. Remaining issues that Mermaid cannot express

These must be handled in the **draw.io redraw** before printing:

| Issue | Fix in draw.io |
|-------|----------------|
| Weak entities (`INCIDENT_EVIDENCE`, `TICKET_STATUS_HISTORY`, `CROSS_BORDER_ALERT`) rendered as plain rectangles | Replace with **double rectangle**; draw the `reportId` relationship as a **double diamond** |
| Derived attributes shown only as text comments | Draw each as a **dashed oval** connected to its entity |
| PK attributes have `PK` marker only | **Underline** the attribute name in the oval |
| The `attr` placeholder token on every line | Remove entirely — classical notation needs no type token |

---

## 6. Submission checklist

- [x] R1 — Crow's Foot notation
- [x] R2 — No data types
- [x] R3 — Latest DB
- [ ] R4 — Redraw weak entities with double shapes in draw.io
- [x] R5 — Derived attributes flagged (in Mermaid; redraw as dashed ovals)
- [x] R6 — Entities & relationships correct
- [x] R7 — No M:N
- [ ] R8 — Print landscape, long bond paper, black & white
- [ ] R9 — Submit to group secretary by Apr 15 or Apr 22
- [x] R10 — Business rules / CHECK constraints documented
