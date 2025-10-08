import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { dbConnect } from '@/lib/db/mongo';
import { ExportBatch } from '@/lib/models/ExportBatch';

export async function POST(req: NextRequest, context: { params: Promise<{ batchId: string }> }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  if (!minRole(auth.user, 'manager')) {
    return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير أو المالك' } }, { status: 403 });
  }
  const { batchId } = await context.params;
  await dbConnect().catch(()=>{});
  const doc = await ExportBatch.findById(batchId).lean().catch(()=>null) as any;
  if (!doc) return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  if (doc.status === 'posted') return NextResponse.json(doc);
  const updated = await ExportBatch.findOneAndUpdate({ _id: batchId }, { $set: { status: 'posted' } }, { new: true }).lean();
  return NextResponse.json(updated);
}

