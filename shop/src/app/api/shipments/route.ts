import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { Shipment } from '@/lib/models/Shipment';
import { CarrierAccount } from '@/lib/models/CarrierAccount';
import { getAdapterFor } from '@/lib/delivery/registry';
import { CreateShipmentSchema } from '@/lib/validators/shipment';
import { chooseCarrierAccount } from '@/lib/delivery/routing';
import { normalizeToE164 } from '@/lib/phone';

export async function POST(req: Request) {
  await dbConnect();
  const idem = req.headers.get('Idempotency-Key') || '';
  if (!idem) return new Response(JSON.stringify({ error: 'Missing Idempotency-Key' }), { status: 400, headers: { 'content-type': 'application/json' } });
  const cached = await getIfExists<any>(idem);
  if (cached) return new Response(JSON.stringify(cached), { headers: { 'content-type': 'application/json' } });
  const body = await req.json();
  const parsed = CreateShipmentSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { 'content-type': 'application/json' } });
  const input = parsed.data;
  const phone = normalizeToE164(input.to.phone);
  if (!phone.e164) return new Response(JSON.stringify({ error: 'Invalid phone' }), { status: 400, headers: { 'content-type': 'application/json' } });

  const accounts = await CarrierAccount.find({ enabled: true }).lean();
  const account = chooseCarrierAccount(accounts as any, { to: { city: input.to.city, country: input.to.country }, weightKg: input.weightKg, codEnabled: !!input.cod?.enabled });
  if (!account) return new Response(JSON.stringify({ error: 'No carrier available' }), { status: 422, headers: { 'content-type': 'application/json' } });
  const adapter = getAdapterFor(account.type as any);

  const created = await adapter.createShipment(input as any, account as any);
  const doc = await Shipment.create({
    orderId: input.orderId,
    carrierAccountId: String((account as any)._id),
    carrier: account.type,
    service: input.service || account.defaultService,
    trackingNumber: created.trackingNumber,
    labelUrl: created.labelUrl,
    status: created.status || 'created',
    to: { ...input.to, phone: phone.e164 },
    cod: input.cod,
    weightKg: input.weightKg,
    pieces: input.pieces,
    events: created.events || [{ status: 'created', at: new Date().toISOString(), code: 'CREATED' }],
    nextPollAt: new Date(Date.now() + 15 * 60000),
    pollAttempt: 0
  });

  const result = { shipmentId: String((doc as any)._id), trackingNumber: doc.trackingNumber, status: doc.status, labelUrl: doc.labelUrl };
  await saveResult(idem, result);
  return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
}

export async function GET(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const sh = await Shipment.findById(id).lean();
    if (!sh) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify(sh), { headers: { 'content-type': 'application/json' } });
  }
  const carrier = searchParams.getAll('carrier');
  const status = searchParams.getAll('status');
  const city = searchParams.get('city');
  const cod = searchParams.get('cod');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const filter: any = {};
  if (carrier?.length) filter.carrier = { $in: carrier };
  if (status?.length) filter.status = { $in: status };
  if (city) filter['to.city'] = city;
  if (cod === 'true') filter['cod.enabled'] = true; else if (cod === 'false') filter['cod.enabled'] = { $ne: true };
  if (dateFrom || dateTo) filter.createdAt = {};
  if (dateFrom) filter.createdAt.$gte = new Date(Number(dateFrom));
  if (dateTo) filter.createdAt.$lte = new Date(Number(dateTo));
  const list = await Shipment.find(filter).sort({ createdAt: -1 }).lean();
  return new Response(JSON.stringify({ shipments: list }), { headers: { 'content-type': 'application/json' } });
}

