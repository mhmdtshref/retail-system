import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { verifyTrackToken } from '@/lib/public/tokens';
import { composeOrderTracking } from '@/lib/track/compose';
import { CarrierAccount } from '@/lib/models/CarrierAccount';
import { Shipment } from '@/lib/models/Shipment';
import { getAdapterFor } from '@/lib/delivery/registry';

const InputSchema = z.object({ orderId: z.string().min(1), t: z.string().min(10) });

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json().catch(() => ({}));
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { orderId, t } = parsed.data;
  try {
    const { orderId: inToken } = await verifyTrackToken(t);
    if (inToken !== orderId) return NextResponse.json({ error: 'Invalid token scope' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const list = await Shipment.find({ orderId, status: { $in: ['created','label_generated','handover','in_transit','out_for_delivery'] } }).lean();
  for (const s of list) {
    try {
      const acc = await CarrierAccount.findById(s.carrierAccountId).lean();
      if (!acc) continue;
      const adapter = getAdapterFor(acc.type as any);
      const res = await adapter.track(s.trackingNumber || '', acc as any);
      const patch: any = { lastSyncAt: new Date() };
      const events = res.events || [];
      if (events.length) patch.$push = { events: { $each: events } };
      if (res.status && res.status !== s.status) patch.status = res.status;
      await Shipment.updateOne({ _id: s._id }, { $set: patch, ...(patch.$push ? { $push: patch.$push } : {}) } as any);
    } catch {}
  }
  const composed = await composeOrderTracking(orderId);
  return NextResponse.json({ ok: true, composed });
}

