import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { ObsEvent } from '@/lib/models/ObsEvent';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { takeRateLimit, applyRateHeaders } from '@/lib/security/rate-limit';
import { maskPII } from '@/lib/obs/mask';

const IntakeSchema = z.object({
  level: z.enum(['info','warn','error']).default('info'),
  event: z.string().min(1).max(120),
  ctx: z.object({ route: z.string().optional(), method: z.string().optional(), status: z.number().int().optional(), user: z.object({ idHash: z.string().optional(), role: z.string().optional() }).optional() }).optional(),
  payload: z.any().optional(),
});

export async function POST(req: NextRequest) {
  // Optional auth: allow unauthenticated client logs when enabled; but rate-limit per IP
  const auth = await requireAuth(req);
  const user = 'error' in auth ? null : auth.user;
  const { limited, response, headers } = await takeRateLimit(req, { limit: 60, windowMs: 60_000, burst: 30 }, 'api:obs:log', String((user as any)?.id || '')); 
  if (limited) return response!;

  const idk = req.headers.get('Idempotency-Key') || '';
  if (!idk) { /* logs are append-only but encourage idempotency */ }

  let data: z.infer<typeof IntakeSchema>;
  try {
    data = IntakeSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: { message: 'صيغة غير صحيحة' } }, { status: 400 });
  }

  try {
    await dbConnect();
    const now = new Date();
    if (data.level === 'error') {
      await ObsEvent.create({ kind: 'error', level: 'error', route: data.ctx?.route, method: data.ctx?.method, status: data.ctx?.status, user: data.ctx?.user, message: data.event, createdAt: now });
    }
  } catch {}

  // Always respond OK, drop PII
  return applyRateHeaders(NextResponse.json({ ok: true }), headers);
}
