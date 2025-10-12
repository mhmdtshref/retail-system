Admin Tools API surface:
- POST /api/admin/tools/fixes/run
- GET  /api/admin/tools/fixes/jobs
- GET  /api/admin/tools/fixes/jobs/[id]
- POST /api/admin/tools/replays/run
- GET  /api/admin/tools/replays/jobs
- GET  /api/admin/tools/replays/jobs/[id]
- GET  /api/admin/tools/idempotency
- POST /api/admin/tools/idempotency/replay
- DELETE /api/admin/tools/idempotency/[key]

All routes require manager/owner and are rate-limited. Provide Idempotency-Key on POST.
