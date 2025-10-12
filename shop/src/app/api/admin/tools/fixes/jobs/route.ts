import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { FixJob } from '@/lib/models/FixJob';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير' } }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(100, Number(url.searchParams.get('limit') || 50));
  const items = await FixJob.find({}).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
  return NextResponse.json({ items });
}
