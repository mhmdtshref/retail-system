import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { FixJob } from '@/lib/models/FixJob';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  const auth = await requireAuth(_req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير' } }, { status: 403 });

  const job = await FixJob.findOne({ $or: [{ _id: params.id }, { jobId: params.id }] }).lean();
  if (!job) return NextResponse.json({ error: { message: 'غير موجود' } }, { status: 404 });
  return NextResponse.json({ job });
}
