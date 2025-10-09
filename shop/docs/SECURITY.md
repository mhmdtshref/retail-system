# SECURITY

This document outlines the baseline security posture for the shop app.

- Authentication uses NextAuth with JWT strategy. Configure `NEXTAUTH_SECRET`.
- Sessions short-lived; refresh rotation recommended behind reverse proxy.
- Cookies should be Secure, HttpOnly where used; SameSite=Lax.
- CSRF protection: double-submit token via `csrf-token` cookie and `X-CSRF-Token` header.
- RBAC: centralized in `src/lib/policy/*`. Deny-by-default.
- Input validation: Zod schemas on API routes; strict, reject unknowns where applicable.
- Rate limiting: in-memory by default with token bucket; can be swapped with Redis adapter. Headers: `X-RateLimit-*`.
- Audit logging: structured events via `AuditLog` model and `lib/security/audit.ts`.
- Webhooks: HMAC SHA-256 verification when secrets provided; anti-replay with TTL keys where used.
- File uploads: MIME/size validation; re-encode client-side where possible; avoid storing originals.
- Security headers: CSP, X-CTO, Referrer-Policy, Permissions-Policy, HSTS (prod).
- CORS: strict allowlist from `CORS_ALLOWLIST`.
- Secrets: no secrets in repo; use `.env` and rotation runbook (`docs/incidents.md`).
- Monitoring: 429 spikes and auth failures can be forwarded to chat integrations (optional).
