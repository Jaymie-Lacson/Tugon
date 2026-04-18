# TUGON — Entity Relationship Diagram (Crow's Foot Notation)

> Source of truth: [server/prisma/schema.prisma](../server/prisma/schema.prisma) — verified against live Supabase SQL schema.
> Generated: 2026-04-18

**Note on column names**: most columns are camelCase in the database. However, the `User` table mixes camelCase (`fullName`, `phoneNumber`, `passwordHash`, `role`, `isPhoneVerified`, `createdAt`, `updatedAt`) with **snake_case** for the verification/ban fields (`is_verified`, `id_image_url`, `verification_status`, etc.) — these are `@map`-ed in Prisma. The diagrams below use the *actual database column names*.

System: **TUGON — Web-Based Incident Management and Decision Support System using Geospatial Analytics**
Scope: Barangays 251, 252, and 256 — Tondo, Manila
DBMS: PostgreSQL (Supabase) via Prisma ORM

---

## 1. Master ERD — All Entities

```mermaid
erDiagram
    USER ||--o| CITIZEN_PROFILE : "has"
    USER ||--o| OFFICIAL_PROFILE : "has"
    USER ||--o{ CITIZEN_REPORT : "files"
    BARANGAY ||--o{ CITIZEN_PROFILE : "registers"
    BARANGAY ||--o{ OFFICIAL_PROFILE : "employs"
    CITIZEN_REPORT ||--o{ INCIDENT_EVIDENCE : "contains"
    CITIZEN_REPORT ||--o{ TICKET_STATUS_HISTORY : "tracks"
    CITIZEN_REPORT ||--o{ CROSS_BORDER_ALERT : "notifies"

    USER ||..o{ AUTH_SESSION : "logs in via"
    USER ||..o{ ADMIN_AUDIT_LOG : "actor of"
    USER ||..o{ ADMIN_NOTIFICATION : "receives"
    USER ||..o{ USER : "verifies / bans (self-ref)"
    CITIZEN_REPORT ||..o{ ADMIN_NOTIFICATION : "references"

    USER {
        text id PK
        text fullName
        text phoneNumber UK
        text passwordHash
        Role role "CITIZEN|OFFICIAL|SUPER_ADMIN"
        boolean isPhoneVerified
        boolean is_verified
        text id_image_url
        VerificationStatus verification_status
        text verification_rejection_reason
        text verified_by_user_id "logical FK to User.id"
        timestamp verified_at
        boolean is_banned
        timestamp banned_at
        text banned_reason
        text banned_by_user_id "logical FK to User.id"
        timestamp createdAt
        timestamp updatedAt
    }

    CITIZEN_PROFILE {
        string id PK
        string userId FK,UK
        string barangayId FK
        string address
        datetime createdAt
        datetime updatedAt
    }

    OFFICIAL_PROFILE {
        string id PK
        string userId FK,UK
        string barangayId FK
        string position
        datetime createdAt
        datetime updatedAt
    }

    BARANGAY {
        string id PK
        string name
        string code UK
        string boundaryGeojson
        datetime createdAt
        datetime updatedAt
    }

    CITIZEN_REPORT {
        text id PK
        text citizenUserId FK
        text routedBarangayCode
        double latitude
        double longitude
        text category "CHECK: Pollution|Noise|Crime|Road Hazard|Other"
        text subcategory "CHECK: 17 allowed values"
        boolean requiresMediation
        text mediationWarning
        TicketStatus status "SUBMITTED|UNDER_REVIEW|IN_PROGRESS|RESOLVED|CLOSED|UNRESOLVABLE"
        text location
        text barangay
        text district
        text description
        ReportSeverity severity "low|medium|high|critical"
        text affectedCount
        boolean hasPhotos
        int photoCount
        boolean hasAudio
        text assignedOfficer
        text assignedUnit
        text resolutionNote
        timestamp submittedAt
        timestamp updatedAt
    }

    INCIDENT_EVIDENCE {
        string id PK
        string reportId FK
        string kind "photo|voice"
        string storageProvider
        string storagePath
        string publicUrl
        string fileName
        string mimeType
        int sizeBytes
        datetime createdAt
    }

    CROSS_BORDER_ALERT {
        string id PK
        string reportId FK
        string sourceBarangayCode
        string targetBarangayCode
        string alertReason
        datetime createdAt
        datetime readAt
    }

    TICKET_STATUS_HISTORY {
        string id PK
        string reportId FK
        TicketStatus status
        string label
        string description
        string actor
        string actorRole
        string note
        datetime createdAt
    }

    ADMIN_AUDIT_LOG {
        string id PK
        string actorUserId
        string action
        string targetType
        string targetId
        string targetLabel
        string details
        datetime createdAt
    }

    ADMIN_NOTIFICATION {
        string id PK
        string recipientUserId
        string kind
        string title
        string message
        string reportId
        string metadata
        datetime createdAt
        datetime readAt
    }

    AUTH_SESSION {
        string id PK
        string sessionId UK
        string userId
        string tokenHash UK
        datetime issuedAt
        datetime expiresAt
        datetime revokedAt
        string revokeReason
        datetime createdAt
        datetime updatedAt
    }

    OTP_CHALLENGE {
        string id PK
        string phoneNumber
        OtpPurpose purpose "REGISTRATION|PASSWORD_RESET"
        string codeHash
        datetime expiresAt
        boolean isVerified
        int failedVerifyAttempts
        datetime lockoutUntil
        datetime lastSentAt
        string registrationFullName
        string registrationBarangayCode
        datetime createdAt
        datetime updatedAt
    }

    IP_RATE_LIMIT_BUCKET {
        string bucketKey PK
        bigint windowStartMs
        int count
        datetime createdAt
        datetime updatedAt
    }
```

Solid lines = enforced FK. Dashed lines (`..`) = logical relationship (no FK constraint in schema — the column references a `User.id` or `CitizenReport.id` value but Prisma has no `@relation`).

---

## 2. Core Domain — Users, Profiles, Barangay

```mermaid
erDiagram
    BARANGAY ||--o{ CITIZEN_PROFILE : "is home of"
    BARANGAY ||--o{ OFFICIAL_PROFILE : "employs"
    USER ||--o| CITIZEN_PROFILE : "extends (if CITIZEN)"
    USER ||--o| OFFICIAL_PROFILE : "extends (if OFFICIAL)"

    USER {
        string id PK
        string phoneNumber UK
        Role role
        boolean isVerified
    }
    CITIZEN_PROFILE {
        string userId FK,UK
        string barangayId FK
    }
    OFFICIAL_PROFILE {
        string userId FK,UK
        string barangayId FK
        string position
    }
    BARANGAY {
        string id PK
        string code UK
        string boundaryGeojson
    }
```

**Cardinality rules**
- A **User** has **at most one** `CitizenProfile` *or* `OfficialProfile` (role-dependent). `SUPER_ADMIN` has neither.
- A **Barangay** has **zero-or-many** citizens and **zero-or-many** officials.
- `barangayId` on both profile tables is **mandatory** — enforces Hard Rule #10 (barangay set at registration).

---

## 3. Incident Reporting Subsystem

```mermaid
erDiagram
    USER ||--o{ CITIZEN_REPORT : "submits"
    CITIZEN_REPORT ||--o{ INCIDENT_EVIDENCE : "attaches"
    CITIZEN_REPORT ||--o{ TICKET_STATUS_HISTORY : "records"
    CITIZEN_REPORT ||--o{ CROSS_BORDER_ALERT : "may trigger"

    CITIZEN_REPORT {
        string id PK
        string citizenUserId FK
        string routedBarangayCode
        float latitude
        float longitude
        TicketStatus status
        ReportSeverity severity
    }
    INCIDENT_EVIDENCE {
        string reportId FK
        string kind "photo|voice"
        string storagePath
    }
    TICKET_STATUS_HISTORY {
        string reportId FK
        TicketStatus status
        string actorRole
    }
    CROSS_BORDER_ALERT {
        string reportId FK
        string sourceBarangayCode
        string targetBarangayCode
    }
```

**Cardinality rules**
- A **CitizenReport** belongs to **exactly one** `User` (the reporter) and has **zero-or-many** evidences, status-history rows, and cross-border alerts.
- `CROSS_BORDER_ALERT` has `@@unique([reportId, targetBarangayCode])` — a report can alert each neighbor **at most once**.
- `TICKET_STATUS_HISTORY` is append-only — enforces Hard Rule #11.

---

## 4. Security, Audit & Operations Subsystem

```mermaid
erDiagram
    USER ||..o{ AUTH_SESSION : "owns"
    USER ||..o{ ADMIN_AUDIT_LOG : "is actor of"
    USER ||..o{ ADMIN_NOTIFICATION : "receives"

    AUTH_SESSION {
        string sessionId UK
        string userId
        string tokenHash UK
        datetime expiresAt
        datetime revokedAt
    }
    ADMIN_AUDIT_LOG {
        string actorUserId
        string action
        string targetType
        string targetId
    }
    ADMIN_NOTIFICATION {
        string recipientUserId
        string kind
        string reportId
        datetime readAt
    }
    OTP_CHALLENGE {
        string phoneNumber
        OtpPurpose purpose
        int failedVerifyAttempts
        datetime lockoutUntil
    }
    IP_RATE_LIMIT_BUCKET {
        string bucketKey PK
        bigint windowStartMs
        int count
    }
```

**Design note** — `AUTH_SESSION`, `ADMIN_AUDIT_LOG`, `ADMIN_NOTIFICATION`, `OTP_CHALLENGE`, and `IP_RATE_LIMIT_BUCKET` store `userId` / `phoneNumber` / `bucketKey` **without** enforced foreign keys. This is intentional: audit rows must survive user deletion, and rate-limit buckets are keyed by transient IPs.

---

## 5. Crow's Foot Notation Legend

| Symbol (Mermaid) | Meaning |
|------------------|---------|
| `\|\|--\|\|`     | one and only one — one and only one |
| `\|\|--o\|`      | one and only one — zero or one |
| `\|\|--o{`       | one and only one — zero or many |
| `\|\|--\|{`      | one and only one — one or many |
| `}o--o{`         | zero or many — zero or many |
| `..`             | logical (non-FK) relationship |

---

## 6. Entity Summary (13 entities)

| # | Entity | Purpose | Enforced FKs |
|---|--------|---------|--------------|
| 1 | **User** | Identity + auth + verification + ban | self-ref on `verifiedByUserId`, `bannedByUserId` (logical) |
| 2 | **CitizenProfile** | Citizen-specific fields | `userId` → User, `barangayId` → Barangay |
| 3 | **OfficialProfile** | Official-specific fields | `userId` → User, `barangayId` → Barangay |
| 4 | **Barangay** | Jurisdiction + boundary GeoJSON | — |
| 5 | **CitizenReport** | Incident ticket | `citizenUserId` → User |
| 6 | **IncidentEvidence** | Photo / voice attachments | `reportId` → CitizenReport |
| 7 | **CrossBorderAlert** | Informational alerts to neighbors | `reportId` → CitizenReport |
| 8 | **TicketStatusHistory** | Status-change audit trail | `reportId` → CitizenReport |
| 9 | **AdminAuditLog** | Super-admin action log | (logical only) |
| 10 | **AdminNotification** | Inbox for officials / admins | (logical only) |
| 11 | **AuthSession** | JWT session revocation store | (logical only) |
| 12 | **OtpChallenge** | Phone OTP verification | (logical only) |
| 13 | **IpRateLimitBucket** | Per-IP rate limiting | — |

---

## 7. CHECK constraints (domain rules at DB level)

Enforced inside `CitizenReport` — these guarantee Hard Rule #4 (incident types preserved exactly):

**`category`** — one of:
```
Pollution · Noise · Crime · Road Hazard · Other
```

**`subcategory`** — one of 17 values:
```
Air pollution (smoke or fumes)        · Water contamination
Illegal dumping or waste              · Blocked drainage or unsanitary area
Loud music or karaoke                 · Construction noise
Street disturbance noise              · Animal-related noise
Theft or robbery                      · Assault or physical altercation
Vandalism                             · Suspicious activity
Potholes                              · Broken streetlights
Blocked sidewalks                     · Road obstruction or illegal parking
Unlisted general issues
```

The system table `_prisma_migrations` is **excluded** from the ERD — it is managed by Prisma for migration state tracking and is not part of the domain model.

---

## 8. How to view this ERD

The diagrams above use **Mermaid** — a text-based diagramming syntax that renders to Crow's Foot ERDs automatically.

### Option A — GitHub (easiest)
Push this file. GitHub renders Mermaid `erDiagram` blocks inline. Open `docs/ERD.md` in the repo UI.

### Option B — VS Code
Install either extension:
- **Markdown Preview Mermaid Support** (`bierner.markdown-mermaid`)
- **Mermaid Preview** (`vstirbu.vscode-mermaid-preview`)

Then open [ERD.md](ERD.md) and press `Ctrl+Shift+V` for preview.

### Option C — Mermaid Live Editor (online)
1. Open https://mermaid.live
2. Copy one of the `erDiagram` blocks above
3. Paste into the editor — renders instantly
4. Export as PNG / SVG / PDF via the *Actions* menu

### Option D — Generate from Prisma (always current)
```bash
npm --prefix server install -D prisma-erd-generator @mermaid-js/mermaid-cli
```
Add to [server/prisma/schema.prisma](../server/prisma/schema.prisma):
```prisma
generator erd {
  provider = "prisma-erd-generator"
  output   = "../../docs/ERD-auto.svg"
}
```
Then run:
```bash
npm --prefix server run prisma:generate
```

### Option E — Export a static image
Install Mermaid CLI:
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i docs/ERD.md -o docs/ERD.png
```
