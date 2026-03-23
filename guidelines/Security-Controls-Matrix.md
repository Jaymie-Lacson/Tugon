# TUGON Security Controls Matrix (Architecture Input)

Date: 2026-03-23
Scope: Frontend (`src/`) + Backend (`server/src/`) + Prisma schema + dependency audits

## 1. Implemented Security Controls

| Domain | Control | Status | Evidence |
|---|---|---|---|
| Authentication | JWT-based API authentication | Implemented | `server/src/middleware/auth.ts`, `server/src/modules/auth/auth.service.ts` |
| Authentication | Password hashing and verification (`bcrypt`) | Implemented | `server/src/modules/auth/auth.service.ts` |
| Authentication | JWT secret presence/length validation | Implemented | `server/src/config/env.ts` |
| Authorization | Route-level RBAC (`CITIZEN`, `OFFICIAL`, `SUPER_ADMIN`) | Implemented | `server/src/routes/index.ts`, `server/src/middleware/requireRole.ts` |
| Authorization | Server-side barangay jurisdiction checks for official actions | Implemented | `server/src/modules/reports/reports.service.ts` |
| Geospatial Security | Geofencing ownership check for citizen report submission | Implemented | `server/src/modules/reports/reports.service.ts`, `server/src/modules/map/geofencing.service.ts` |
| Data Validation | Report category/subcategory/severity/location validation | Implemented | `server/src/modules/reports/reports.service.ts` |
| Upload Validation | Evidence MIME allowlist + filename sanitization | Implemented | `server/src/modules/reports/evidenceStorage.service.ts` |
| Verification Security | Resident ID MIME allowlist + signed preview URL | Implemented | `server/src/modules/verification/verification.service.ts` |
| Privacy | Citizen masking in admin list + anonymized super-admin report identity | Implemented | `server/src/modules/admin/admin.service.ts`, `server/src/modules/reports/reports.service.ts` |
| Auditability | Admin audit logs for role/user/boundary actions | Implemented | `server/src/modules/admin/admin.service.ts`, `server/prisma/schema.prisma` |
| Access Boundaries | Cross-border alerts are informational; jurisdiction actions are restricted | Implemented | `server/src/modules/reports/reports.service.ts` |
| Baseline Hygiene | `.env` files excluded from source control | Implemented | `.gitignore` |

## 2. Missing or Incomplete Controls (To Implement)

| Domain | Gap | Risk | Priority | Recommended Implementation |
|---|---|---|---|---|
| Transport/API Hardening | Open CORS policy (`cors()`) | Unauthorized cross-origin API use | High | Restrict origins, methods, and headers in `server/src/app.ts` |
| HTTP Hardening | Missing security headers (`helmet`, HSTS, CSP, X-Content-Type-Options, etc.) | Browser attack surface remains broad | High | Add `helmet` and explicit header policy in `server/src/app.ts` |
| Abuse Protection | No rate limiting on auth/OTP/report endpoints | Brute force, OTP abuse, DoS | Critical | Add per-IP and per-account rate limits (`/auth/*`, `/citizen/reports`) |
| OTP Security | OTP uses `Math.random` and has no attempt lockout/cooldown | Guessing and abuse risk | Critical | Use CSPRNG (`crypto.randomInt`) + max attempts + resend cooldown |
| OTP Exposure | OTP can be logged and exposed in responses under non-prod/mock logic | Secret leakage | High | Remove OTP logging/exposure in production-safe paths |
| Session Security | Access token stored in `localStorage` | XSS token theft impact | High | Move to secure HttpOnly cookie strategy or strict token hardening |
| Token Revocation | Revoked-token store is in-memory only | Revocation lost on restart, not scalable | High | Persist revocations in Redis/DB with TTL |
| Upload Security | No strict file size caps, magic-byte checks, malware scanning | Malicious file upload risk | High | Enforce size limits, content sniffing, and AV scanning pipeline |
| Evidence Storage | Fallback mode allows `storageProvider: "none"` in some paths | Weaker evidence integrity and chain-of-custody | Medium | Require storage upload in production (`REQUIRE_EVIDENCE_STORAGE_UPLOAD=1`) |
| Verification Storage | ID upload may fallback to inline data URL on storage error | Sensitive data handling risk | High | Fail closed in production; never persist inline ID payloads |
| Credential Policy | Password rule only checks length >= 8 | Weak credential quality | Medium | Add complexity checks and breached-password screening |
| Auth Assurance | No MFA for `OFFICIAL`/`SUPER_ADMIN` | Account takeover blast radius | High | Add MFA/step-up auth for privileged roles |
| Configuration Governance | `.env.example` templates missing in current workspace | Misconfiguration risk | Medium | Add root and `server/.env.example` with safe defaults/docs |
| Monitoring | No centralized security event monitoring/alerts | Slow incident detection | Medium | Add structured logs + alerting for auth failures and abuse signals |

## 3. Dependency Vulnerability Scan Snapshot

### Root/Frontend (`npm audit --json`)
- `high`: `flatted` (prototype pollution advisory)
- `high`: `tar` (path traversal advisory)
- `moderate`: `vite@6.3.5` (fix available: `6.4.1`)

### Backend (`npm --prefix server audit --json`)
- `high`: `prisma` dependency chain via `@prisma/config` -> `effect`
- Fixes available per npm audit output

## 4. Security Features for Architecture Diagram (Use As Labels)

### Existing Security Blocks
- API Authentication (JWT)
- Role-Based Access Control (RBAC Guard)
- Geofencing Jurisdiction Guard
- Verification Review Workflow Controls
- Evidence Type Validation Layer
- Admin Audit Log Service
- Privacy Masking/Anonymization Layer

### Planned Security Blocks
- API Security Gateway (CORS policy + `helmet` + rate limiting)
- OTP Security Service (CSPRNG, attempt lockout, cooldown)
- Secure Session Management (HttpOnly secure cookies or equivalent)
- Upload Security Pipeline (size limits, file signature checks, malware scan)
- Revocation/Session Store (Redis/DB-backed)
- Security Monitoring & Alerting

## 5. Suggested Priority Roadmap

1. Critical: Rate limiting + OTP hardening (secure RNG, lockouts, cooldown)
2. High: CORS restriction + `helmet` + remove OTP/PII leakage in logs
3. High: Replace `localStorage` token strategy for privileged access paths
4. High: Persistent token revocation + production fail-closed upload/verification storage
5. Medium: Password policy strengthening + config templates + monitoring improvements

## 6. Notes for Capstone Defense

- Current design already enforces server-side authorization and geospatial jurisdiction, which are strong core controls for incident governance.
- The highest remaining risks are abuse prevention and session hardening rather than missing basic auth.
- For architecture presentation, classify controls as: Preventive (RBAC/geofencing), Detective (audit logs), Corrective (status workflow + restricted transitions).

## 7. Upload Hardening Env Flags

Use these environment variables to tune upload security without code changes:

- `EVIDENCE_MAX_PHOTO_BYTES`
	- Maximum photo evidence payload size in bytes.
	- Default: `5242880` (5 MB)

- `EVIDENCE_MAX_AUDIO_BYTES`
	- Maximum audio evidence payload size in bytes.
	- Default: `10485760` (10 MB)

- `VERIFICATION_ID_MAX_BYTES`
	- Maximum resident ID upload payload size in bytes.
	- Default: `5242880` (5 MB)

- `REQUIRE_EVIDENCE_STORAGE_UPLOAD`
	- When `1`, report evidence upload fails if storage is unavailable.
	- Keep `1` in stricter production deployments.

- `REQUIRE_VERIFICATION_ID_STORAGE_UPLOAD`
	- When `1`, resident ID upload fails closed if storage is unavailable or upload fails.
	- Sensitive-file hardening flag; recommended as `1` for production.

Production note:
- Verification ID uploads are treated as sensitive.
- In production runtime, ID uploads now fail closed even without this flag.
