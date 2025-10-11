# Observability (Logs, Metrics, Errors)

Arabic/RTL friendly dashboards, privacy-first. This doc summarizes:
- What we collect (no PII), how to read it, and how to react.

## Logging
- JSON logs with fields: `time, level, service, env, requestId, correlationId, user.role, method, path`.
- Sampling: errors 100%, info ~10% (LOG_SAMPLE_INFO env). Tune in Settings → Observability.
- PII masking: keys matching `/email|phone|token|secret|key|password|pin|card|authorization|auth|session/i` are hashed/omitted.
- Client events can be posted to `/api/obs/log` (rate-limited). Offline queues should batch on reconnect.

## Metrics (Prometheus)
- Endpoint: `/api/_metrics` (Manager/Owner only unless `OBS_METRICS_PUBLIC=true`).
- Exported series:
  - `http_requests_total{route,method,status}`
  - `http_request_duration_ms_bucket{route,method,le}` + `_sum/_count`
  - `db_ops_total{collection,op}`
  - `orders_total{status}`
  - `pos_sales_total`, `pos_sales_value_total`
  - `cache_hits_total{key}`, `cache_misses_total{key}` (if used)
- Buckets (ms): 5,10,25,50,100,250,500,1000,2500.

## Error Tracking
- Pluggable provider: `none | console | sentry-webhook`.
- Each event tagged with `env, release, commitSha, userRole?`. Payload masked.
- Global server capture via `withErrorBoundary` and uncaught promise handlers (future work if needed by platform runtime).
- Client capture via `components/obs/ErrorBoundary`.

## Dashboards
- `/admin/observability`: Overview cards + tables (latest errors, slow queries). Arabic labels, RTL.
- For time series, connect Prometheus + Grafana using `/api/_metrics`.

## Runbooks
- Error spike:
  1. Open `/admin/observability`, filter latest errors, note route and status.
  2. Check corresponding `http_request_duration_ms` and `http_requests_total` in Prometheus.
  3. If DB related, review slow queries table and `/_diag/perf` (internal).
  4. Roll back recent changes if tied to a release; check tags.
- Latency P95 degradation:
  1. Inspect top slow endpoints by `http_request_duration_ms_bucket`.
  2. Sample requests in logs using `requestId` and correlation.
  3. Profile DB; add indexes if needed.
- Privacy checks:
  - Ensure no tokens/emails/phones in logs. Report to security if found.

## Configuration
- Settings → Observability:
  - Info sampling %, client logs toggle, metrics exposure, error provider + webhook.
- Env:
  - `LOG_LEVEL`, `LOG_SAMPLE_INFO` (0.0..1.0), `OBS_METRICS_PUBLIC`, `OBS_SLOW_MS`.

## Notes
- Overhead: logging < 2% CPU, metrics < 5%. Logs are console-JSON (shipping to platform collector). All IO async.
- Graceful degradation: if DB/env missing, endpoints return minimal data without breaking POS/flows.
