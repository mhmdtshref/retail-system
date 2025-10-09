# Threat Model

## Assets
- Orders, payments, customer PII, inventory, cash drawers, audit logs.

## Trust Boundaries
- Browser ↔ API (Next.js route handlers)
- External delivery/notification webhooks ↔ API
- MongoDB / Redis (if used) backend

## Threats & Mitigations
- A1: Broken Access Control → Central RBAC, middleware gating, `requireCan` checks.
- A2: Cryptographic Failures → HTTPS, HSTS, short-lived JWT, secure cookies.
- A3: Injection → Zod validation, parameterized queries, no dynamic eval.
- A4: Insecure Design → Deny-by-default, least privilege, idempotency keys.
- A5: Security Misconfiguration → CSP, headers, strict CORS, environment validation.
- A6: Vulnerable Components → CI audit gates.
- A7: Identification & Authentication Failures → Uniform login errors, optional lockout.
- A8: Software & Data Integrity Failures → Signature-verified webhooks, audit trails.
- A9: Security Logging & Monitoring Failures → Structured `AuditLog`, minimal PII.
- A10: SSRF → Restrict outbound, validate URLs (future helper).

Residual risks include user misconfiguration of CORS/Secrets and missing Redis adapter in production.
