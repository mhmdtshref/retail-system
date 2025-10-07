import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Customer } from '@/lib/models/Customer';
import { requireAuth, requireCan } from '@/lib/policy/api';

const MergeSchema = z.object({ sourceId: z.string().min(1), targetId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'CUSTOMERS.MERGE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const body = await req.json();
  const parsed = MergeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sourceId, targetId } = parsed.data;
  if (sourceId === targetId) return NextResponse.json({ error: { message: 'Cannot merge same record' } }, { status: 400 });
  const source: any = await Customer.findById(sourceId).lean();
  const target: any = await Customer.findById(targetId).lean();
  if (!source || !target) return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });

  // Merge arrays & fields (target wins core fields)
  const phoneMap = new Map<string, any>();
  for (const p of (target.phones || [])) phoneMap.set(p.e164, p);
  for (const p of (source.phones || [])) if (!phoneMap.has(p.e164)) phoneMap.set(p.e164, p);
  const mergedPhones = Array.from(phoneMap.values());

  const mergedTags = Array.from(new Set([...(target.tags || []), ...(source.tags || [])]));
  const mergedAddresses = [...(target.addresses || [])];
  for (const a of (source.addresses || [])) {
    const exists = mergedAddresses.find((x: any) => x.line1 === a.line1 && x.city === a.city && x.phone === a.phone);
    if (!exists) mergedAddresses.push(a);
  }

  const patch: any = {
    phones: mergedPhones,
    tags: mergedTags,
    addresses: mergedAddresses,
    status: 'active'
  };

  await Customer.updateOne({ _id: targetId }, { $set: patch });
  await Customer.updateOne({ _id: sourceId }, { $set: { status: 'archived' } });

  const updated = await Customer.findById(targetId).lean();
  return NextResponse.json({ mergedInto: targetId, archived: sourceId, customer: updated });
}

