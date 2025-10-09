import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { SendIntentSchema } from '@/lib/validators/notifications';
import { enqueueNotification, deliverNow } from '@/lib/notifications/engine';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { takeRateLimit, applyRateHeaders } from '@/lib/security/rate-limit';
import { verifyCsrf } from '@/lib/security/csrf';
import { writeAudit } from '@/lib/security/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.SALE'); // cashiers can trigger transactional sends
  if (allowed !== true) return allowed;
  await dbConnect();
  const csrf = verifyCsrf(req);
  if (csrf !== true) return csrf;
  const { limited, response, headers } = await takeRateLimit(req, { limit: 10, windowMs: 5 * 60 * 1000, burst: 5 }, 'api:notifications:send', String((auth.user as any)?.id || (auth.user as any)?._id || ''));
  if (limited) {
    await writeAudit({ action: 'notification.send', status: 'denied', actor: { id: String((auth.user as any)?.id || (auth.user as any)?._id || ''), role: (auth.user as any)?.role }, req });
    return response!;
  }
  const idk = req.headers.get('Idempotency-Key') || '';
  if (!idk) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const existing = await getIfExists(idk);
  if (existing) return NextResponse.json(existing);
  const body = await req.json();
  const parsed = SendIntentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const channels = parsed.data.channels || ['email'];
  const results: any[] = [];
  for (const ch of channels) {
    const res = await deliverNow({ event: parsed.data.event as any, entity: parsed.data.entity as any, customerId: parsed.data.customerId, channel: ch as any, data: body?.data || {}, idempotencyKey: `${idk}:${ch}`, baseUrl: new URL(req.url).origin });
    results.push({ channel: ch, ...res });
  }
  const result = { ok: true, results };
  await saveResult(idk, result);
  const res = NextResponse.json(result);
  return applyRateHeaders(res, headers);
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { SendEventSchema } from '@/lib/validators/notifications';
import { sendNotification } from '@/lib/notifications/engine';
import { getIfExists, saveResult } from '@/lib/idempotency';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  // Cashier can trigger transactional sends
  const allowed = await requireCan(req, auth.user, 'POS.SALE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const csrf = verifyCsrf(req);
  if (csrf !== true) return csrf;
  const { limited, response, headers } = await takeRateLimit(req, { limit: 10, windowMs: 5 * 60 * 1000, burst: 5 }, 'api:notifications:send', String((auth.user as any)?.id || (auth.user as any)?._id || ''));
  if (limited) {
    await writeAudit({ action: 'notification.send', status: 'denied', actor: { id: String((auth.user as any)?.id || (auth.user as any)?._id || ''), role: (auth.user as any)?.role }, req });
    return response!;
  }
  const idk = req.headers.get('Idempotency-Key') || '';
  if (!idk) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const cached = await getIfExists(idk);
  if (cached) return NextResponse.json(cached);
  const body = await req.json();
  const parsed = SendEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const res = await sendNotification({ ...parsed.data, idempotencyKey: idk } as any);
  await saveResult(idk, res);
  return applyRateHeaders(NextResponse.json(res), headers);
}

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { SendIntentSchema } from '@/lib/validators/notifications';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { sendNotification } from '@/lib/notifications/engine';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.SALE'); // cashiers can trigger transactional
  if (allowed !== true) return allowed;
  await dbConnect();
  const csrf = verifyCsrf(req);
  if (csrf !== true) return csrf;
  const { limited, response, headers } = await takeRateLimit(req, { limit: 10, windowMs: 5 * 60 * 1000, burst: 5 }, 'api:notifications:send', String((auth.user as any)?.id || (auth.user as any)?._id || ''));
  if (limited) {
    await writeAudit({ action: 'notification.send', status: 'denied', actor: { id: String((auth.user as any)?.id || (auth.user as any)?._id || ''), role: (auth.user as any)?.role }, req });
    return response!;
  }
  const idk = req.headers.get('Idempotency-Key') || '';
  if (!idk) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const cached = await getIfExists(idk);
  if (cached) return NextResponse.json(cached);
  const body = await req.json();
  const parsed = SendIntentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const res = await sendNotification({ ...parsed.data, idempotencyKey: idk } as any);
  await saveResult(idk, res);
  return applyRateHeaders(NextResponse.json(res), headers);
}
