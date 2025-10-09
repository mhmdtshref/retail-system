import { dbConnect } from '@/lib/db/mongo';
import { Shipment } from '@/lib/models/Shipment';
import { CarrierAccount } from '@/lib/models/CarrierAccount';
import { getAdapterFor } from '@/lib/delivery/registry';
import { AuditLog } from '@/lib/models/AuditLog';
import { writeAudit } from '@/lib/security/audit';
import { revalidateTag } from 'next/cache';

export async function POST(req: Request, context: { params: Promise<{ carrier: string }> }) {
  await dbConnect();
  const { carrier } = await context.params;
  const type = carrier as any;
  const adapter = getAdapterFor(type);
  // Find accounts of this type; try each to verify webhook signature if needed
  const accounts = await CarrierAccount.find({ type }).lean();
  for (const acc of accounts) {
    try {
      const event = await adapter.parseWebhook(req.clone(), acc as any);
      if (!event || !event.trackingNumber) continue;
      const sh = await Shipment.findOne({ trackingNumber: event.trackingNumber }).lean();
      if (!sh) continue;
      const updates: any = { lastSyncAt: new Date(), webhookVerified: event.verified === true };
      if (event.events && event.events.length) updates.$push = { events: { $each: event.events } };
      if (event.status && event.status !== sh.status) updates.status = event.status;
      await Shipment.updateOne({ _id: sh._id }, { $set: updates, ...(updates.$push ? { $push: updates.$push } : {}) } as any);
      await writeAudit({ action: 'webhook.received', entity: { type: 'Shipment', id: String(sh._id) }, meta: { carrier: type, verified: !!event.verified } as any });
      try { revalidateTag(`track:order:${sh.orderId}`); } catch {}
      try {
        const status = event.status || sh.status;
        const map: any = { out_for_delivery: 'OUT_FOR_DELIVERY', delivered: 'DELIVERED' };
        const ev = map[status as string];
        if (ev) {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `shipment:webhook:${String(sh._id)}:${status}` },
            body: JSON.stringify({ event: ev, entity: { type: 'order', id: String(sh.orderId) }, customerId: undefined })
          }).catch(()=>{});
        }
      } catch {}
      return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
    } catch {
      continue;
    }
  }
  await writeAudit({ action: 'webhook.rejected', status: 'failed', entity: { type: 'Shipment' }, meta: { reason: 'unrecognized' } as any });
  return new Response(JSON.stringify({ error: 'Unrecognized webhook' }), { status: 400, headers: { 'content-type': 'application/json' } });
}

