import { dbConnect } from '@/lib/db/mongo';
import { Shipment } from '@/lib/models/Shipment';
import { CarrierAccount } from '@/lib/models/CarrierAccount';
import { getAdapterFor } from '@/lib/delivery/registry';
import { TrackSchema } from '@/lib/validators/shipment';

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const parsed = TrackSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { 'content-type': 'application/json' } });
  const input = parsed.data;
  const filter: any = { status: { $in: ['created','label_generated','handover','in_transit','out_for_delivery'] } };
  if (input.ids?.length) filter._id = { $in: input.ids };
  if (input.since) filter.updatedAt = { $gte: new Date(input.since) };
  const list = await Shipment.find(filter).lean();
  let updated = 0;
  for (const s of list) {
    const acc = await CarrierAccount.findById(s.carrierAccountId).lean();
    if (!acc) continue;
    const adapter = getAdapterFor(acc.type as any);
    try {
      const res = await adapter.track(s.trackingNumber || '', acc as any);
      const patch: any = { lastSyncAt: new Date() };
      const events = res.events || [];
      if (events.length) patch.$push = { events: { $each: events } };
      if (res.status && res.status !== s.status) patch.status = res.status;
      await Shipment.updateOne({ _id: s._id }, { $set: patch, ...(patch.$push ? { $push: patch.$push } : {}) } as any);
      if (res.status && res.status !== s.status) updated++;
    } catch {}
  }
  return new Response(JSON.stringify({ count: list.length, updated }), { headers: { 'content-type': 'application/json' } });
}

