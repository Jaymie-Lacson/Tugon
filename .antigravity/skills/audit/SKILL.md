---
name: audit
description: Security and compliance audit of TUGON's auth, RBAC, geofencing, and data handling. Use before major releases or after security-sensitive changes.
---

# Security & Compliance Audit

Perform a thorough security audit of the TUGON codebase against its documented requirements.

## Audit Areas

### 1. Authentication (JWT + OTP)
- Verify JWT tokens are validated on every protected route
- Check token expiry is enforced
- Confirm OTP is required for phone verification
- Look for hardcoded secrets or tokens
- Check that `server/.env` values are not committed

### 2. Role-Based Access Control (RBAC)
- Verify `requireRole` middleware is applied to all admin/official routes
- Confirm RBAC checks are server-side (search for any frontend-only permission gates)
- Check that Citizen, Barangay Official, and Super Admin roles have correct access boundaries
- Verify role cannot be self-escalated

### 3. Server-Side Geofencing
- Verify `resolveBarangayFromCoordinates` is called server-side on incident creation
- Confirm `isWithinBarangayBoundary` is used for routing
- Check that frontend does NOT make standalone geofencing decisions
- Verify cross-border alerts are informational only

### 4. Data Handling & Privacy
- Check file upload validation (type allowlists for photos and voice)
- Verify audit logging is in place for sensitive operations
- Confirm privacy masking is applied where documented
- Look for SQL injection or Prisma raw query risks

### 5. Known Gaps (verify not regressed)
- CORS configuration status
- Security headers (Helmet or equivalent)
- Rate limiting implementation
- OTP lockout mechanism
- Session revocation
- Upload content validation (beyond file extension)

## Output Format

For each area, report:
- **Status**: Implemented / Partial / Missing / Regressed
- **Evidence**: File paths and line numbers
- **Findings**: Any vulnerabilities or gaps discovered
- **Priority**: Critical / High / Medium / Low

End with a summary table and top 3 recommended actions.
