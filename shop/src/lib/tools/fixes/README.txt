Each fixer implements two phases:
- scan(ctx): yield diffs for preview. Do NOT mutate.
- apply(ctx): apply minimal patches with optimistic concurrency and idempotency.

ctx: { params: any; dryRun: boolean; jobId: string; createdBy: string }
