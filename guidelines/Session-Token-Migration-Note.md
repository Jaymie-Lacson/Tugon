# Session/Token Hardening Migration Note

Date: 2026-03-23

## Summary

TUGON moved to a cookie-first session model to reduce XSS impact from token persistence in browser storage.

- Backend now sets an `HttpOnly` auth cookie on login and create-password.
- Frontend now stores only user profile metadata in `localStorage` and no longer relies on persisted access tokens.
- Backend still supports `Authorization: Bearer <token>` for migration compatibility.

## Backend Changes

- Auth middleware accepts token from:
  - `Authorization: Bearer ...` (legacy compatibility)
  - `HttpOnly` cookie (preferred)
- Logout revokes the current session token and clears auth cookie.
- Persistent session tracking/revocation is stored in DB table: `AuthSession`.

## Frontend Changes

- API calls now use `credentials: "include"` to send auth cookies.
- Bearer header is sent only if a legacy token is present in memory.
- `authSession` utility persists only `user` info in localStorage.

## Rollout Sequence

1. Deploy backend with migration for `AuthSession` table.
2. Apply Prisma migration in target environment.
3. Deploy frontend cookie-first update.
4. Monitor auth/login/logout metrics and 401 rates.
5. Optionally disable token-in-body response later by setting `AUTH_RETURN_TOKEN_IN_BODY=0` after confirming all clients are cookie-compatible.

## Required Coordination

- Frontend and backend must share the same API origin or have CORS configured with credentials and allowed origins.
- In production, ensure HTTPS for secure cookies.

## Environment Flags

- `AUTH_COOKIE_NAME` (default: `tugon.sid`)
- `AUTH_COOKIE_SECURE_MODE` (`auto` | `always` | `never`)
- `AUTH_COOKIE_SAME_SITE` (`lax` | `strict` | `none`)
- `AUTH_COOKIE_MAX_AGE_SECONDS` (default: `28800`)
- `AUTH_RETURN_TOKEN_IN_BODY` (`1` keeps legacy response token, `0` hides token from body)

## Residual Compatibility Notes

- Existing clients that still use bearer tokens continue to work.
- New cookie-first clients get reduced XSS token exfiltration risk because token is not persisted in localStorage.
