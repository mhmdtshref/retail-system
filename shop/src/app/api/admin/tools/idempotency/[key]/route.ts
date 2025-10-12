import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { takeRateLimit, applyRateHeaders } from '@/lib/security/rate-limit';
import { IdempotencyRecord } from '@/lib/models/IdempotencyRecord';

export async function DELETE(req: NextRequest, { params }: { params: { key: string } }) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير' } }, { status: 403 });

  const { limited, response, headers } = await takeRateLimit(req, { limit: 10, windowMs: 60_000, burst: 2 }, 'api:admin:tools:idemp:delete', String(auth.user?.id || ''));
  if (limited) return response!;

  const res = await IdempotencyRecord.deleteOne({ _id: params.key });
  return applyRateHeaders(NextResponse.json({ deleted: res.deletedCount || 0 }), headers);
}
