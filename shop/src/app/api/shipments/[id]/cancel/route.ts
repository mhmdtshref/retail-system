import { dbConnect } from '@/lib/db/mongo';
import { Shipment } from '@/lib/models/Shipment';
import { CarrierAccount } from '@/lib/models/CarrierAccount';
import { getAdapterFor } from '@/lib/delivery/registry';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { requireAuth, requireCan } from '@/lib/policy/api';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const auth = await requireAuth(req as any);
  if ('error' in auth) return auth.error as any;
  const can = await requireCan(req as any, auth.user, 'SETTINGS.MANAGE');
  if (can !== true) return can;
  const { id } = await context.params;
  const idem = req.headers.get('Idempotency-Key') || '';
  if (!idem) return new Response(JSON.stringify({ error: 'Missing Idempotency-Key' }), { status: 400, headers: { 'content-type': 'application/json' } });
  const cached = await getIfExists<any>(idem);
  if (cached) return new Response(JSON.stringify(cached), { headers: { 'content-type': 'application/json' } });
  const sh = await Shipment.findById(id).lean();
  if (!sh) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  if (['delivered','failed','returned','cancelled'].includes(sh.status)) return new Response(JSON.stringify({ error: 'Terminal' }), { status: 422, headers: { 'content-type': 'application/json' } });
  const acc = await CarrierAccount.findById(sh.carrierAccountId).lean();
  if (!acc) return new Response(JSON.stringify({ error: 'Carrier missing' }), { status: 404, headers: { 'content-type': 'application/json' } });
  const adapter = getAdapterFor(acc.type as any);
  const res = await adapter.cancelShipment(sh as any, acc as any);
  await Shipment.updateOne({ _id: sh._id }, { $set: { status: res.status || 'cancelled' }, $push: { events: { $each: res.events || [] } } });
  const result = { ok: true, status: res.status || 'cancelled' };
  await saveResult(idem, result);
  return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
}

