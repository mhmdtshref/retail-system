# Incident Runbook

## Authentication Compromise
1. Rotate `NEXTAUTH_SECRET`, invalidate sessions.
2. Force logout by rotating JWT signing secret; communicate to users.
3. Review `AuditLog` for suspicious activity.

## Secret Rotation
1. Generate new keys, set with `*_VERSION`.
2. Deploy with dual-read, write-new; then flip.
3. Update `settings` UI to show `rotatedAt` and key version (manager only).

## Webhook Replay/Abuse
1. Verify HMAC; block nonces for 5m.
2. Increase rate limits on offending IP/user.
3. Notify via chat webhook if sustained.

## Data Restore
1. Test restore in non-prod first.
2. Verify integrity and access controls.
3. Run in maintenance window; audit outcome with `restore.run`.
