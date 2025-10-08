import { dbConnect } from '@/lib/db/mongo';
import { Shipment } from '@/lib/models/Shipment';
import { CarrierAccount } from '@/lib/models/CarrierAccount';
import { getAdapterFor } from '@/lib/delivery/registry';
import { AuditLog } from '@/lib/models/AuditLog';

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
      await AuditLog.create({ action: 'shipment.webhook', subject: { type: 'Shipment', id: String(sh._id) }, dataHash: undefined });
      return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
    } catch {
      continue;
    }
  }
  return new Response(JSON.stringify({ error: 'Unrecognized webhook' }), { status: 400, headers: { 'content-type': 'application/json' } });
}

