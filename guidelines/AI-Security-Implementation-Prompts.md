# AI Security Implementation Prompts (TUGON)

Use these copy-paste prompts to drive secure, phased implementation with minimal risk.

## 0. Master Orchestration Prompt (Use First)

```text
Read these files first before proposing code changes:
- ARCHITECTURE.md
- guidelines/Security-Controls-Matrix.md
- AGENTS.md
- .github/copilot-instructions.md

You are implementing security hardening in phases. Do not do broad rewrites.
Preserve all existing project rules (roles, geofencing, ticket lifecycle, capstone scope).

Execution protocol:
1) Summarize what you understood.
2) List exact files to modify.
3) Propose the smallest safe plan for THIS phase only.
4) Implement code changes.
5) Add/update integration tests.
6) Run tests and report results.
7) List residual risks and next phase recommendation.

Global constraints:
- Preserve existing APIs unless change is security-critical.
- Keep behavior backward-compatible where possible.
- No placeholder logic if real logic can be implemented.
- Document assumptions explicitly before risky changes.
- Prefer minimal, reviewable commits.

Start with Phase 1 now: API hardening (CORS + security headers + rate limiting).
```

## 1. Phase 1 Prompt: API Hardening (CORS + Helmet + Rate Limiting)

```text
Implement Phase 1 security hardening with minimal code changes:

Requirements:
- Restrict CORS to env-configured allowed origins (no wildcard in production).
- Add helmet-based security headers.
- Add rate limiting for:
  - /api/auth/* (strict)
  - /api/citizen/reports (moderate)
- Keep local development workable via env config.
- Keep existing route behavior unchanged apart from hardening.

Also do:
- Add env variables in config parsing/validation.
- Add tests that verify:
  - Disallowed origin is rejected in production mode policy.
  - Rate limit returns expected status/message after threshold.
- Update docs briefly if needed.

Before editing, list exact files you will change and why.
```

### Attach these files for Phase 1

- `ARCHITECTURE.md`
- `guidelines/Security-Controls-Matrix.md`
- `AGENTS.md`
- `.github/copilot-instructions.md`
- `server/src/app.ts`
- `server/src/config/env.ts`
- `server/src/server.ts`
- `server/package.json`
- `server/tests/admin.integration.test.ts`
- `server/tests/citizen-reports.integration.test.ts`

## 2. Phase 2 Prompt: OTP Hardening

```text
Implement Phase 2 OTP security hardening.

Requirements:
- Replace OTP generation with cryptographically secure generation.
- Add OTP verification attempt limit with temporary lockout.
- Add resend cooldown window.
- Remove OTP leakage from logs and response payloads in unsafe modes.
- Keep citizen registration UX flow the same.

Also do:
- Add env-driven settings for OTP attempts, lockout, cooldown.
- Add tests for:
  - repeated wrong OTP -> lockout
  - resend too early -> blocked
  - successful verification path unaffected

Before editing, list exact files to change and why.
```

### Attach these files for Phase 2

- `server/src/modules/auth/auth.service.ts`
- `server/src/modules/auth/store.ts`
- `server/src/modules/auth/auth.routes.ts`
- `server/src/modules/auth/types.ts`
- `server/src/config/env.ts`
- `server/tests/` (auth-related tests or create new auth integration test)
- `guidelines/Security-Controls-Matrix.md`

## 3. Phase 3 Prompt: Upload and Evidence Hardening

```text
Implement Phase 3 upload hardening with minimal changes.

Requirements:
- Enforce strict max file sizes for photo/audio/ID uploads.
- Keep/extend MIME allowlists.
- Add basic content signature checks (magic bytes) where practical.
- In production, fail closed on storage upload failure for sensitive files.
- Preserve existing evidence flow and API shape as much as possible.

Also do:
- Add tests for invalid type, oversized payload, and fallback behavior.
- Document env flags for production fail-closed mode.

Before editing, list exact files to change and why.
```

### Attach these files for Phase 3

- `server/src/modules/reports/evidenceStorage.service.ts`
- `server/src/modules/verification/verification.service.ts`
- `server/src/modules/reports/reports.service.ts`
- `server/src/config/env.ts`
- relevant files in `server/tests/`
- `guidelines/Security-Controls-Matrix.md`

## 4. Phase 4 Prompt: Session and Token Hardening

```text
Implement Phase 4 session/token hardening plan.

Requirements:
- Reduce XSS impact from token handling (current localStorage pattern).
- Propose and implement a secure session approach suitable for this stack.
- Add persistent token revocation/session tracking (not in-memory only).
- Keep compatibility and migration path clear.

Also do:
- Add or update tests for login/logout/session invalidation flows.
- Provide a migration note for frontend and backend coordination.

Before editing, list exact files to change and why.
```

### Attach these files for Phase 4

- `src/app/utils/authSession.ts`
- `src/app/services/authApi.ts`
- `server/src/middleware/auth.ts`
- `server/src/modules/auth/auth.service.ts`
- `server/src/modules/auth/store.ts`
- `server/src/config/env.ts`
- relevant tests in `server/tests/` and frontend auth flows

## 5. Optional Phase 5 Prompt: Privileged Account Security

```text
Implement privileged account hardening for OFFICIAL and SUPER_ADMIN.

Requirements:
- Add step-up auth or MFA-ready hooks for privileged operations.
- Add stricter audit events for sensitive actions.
- Add alertable security event logs (auth failures, role changes, abuse indicators).
- Keep capstone scope realistic and implementation defendable.

Before editing, list exact files to change and why.
```

### Attach these files for Phase 5

- `server/src/modules/admin/admin.routes.ts`
- `server/src/modules/admin/admin.service.ts`
- `server/src/modules/auth/*`
- `server/src/config/env.ts`
- `server/prisma/schema.prisma`
- relevant tests in `server/tests/`

## 6. Fast Quality Gate Prompt (Use After Each Phase)

```text
Run a security quality gate for the completed phase:
1) Show changed files.
2) Run integration tests and summarize pass/fail.
3) Run npm audit (root and server) and summarize key findings.
4) Confirm which matrix items were closed.
5) List remaining risks and next best phase.
```
