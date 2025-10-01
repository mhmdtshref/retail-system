import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/delivery';
import { mockDb } from '@/lib/mock/store';

export async function POST(req: Request) {
  const sig = req.headers.get('x-signature') || '';
  const bodyText = await req.text();
  const provider = getProvider();
  const ok = provider.verifyWebhook(sig, bodyText);
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  let payload: any = {};
  try { payload = JSON.parse(bodyText); } catch {}
  const externalId = payload.externalId as string;
  const status = payload.status as any;
  if (!externalId) return NextResponse.json({ error: 'externalId required' }, { status: 400 });
  const next = mockDb.updateShipmentStatusByExternalId(externalId, status || 'in_transit', payload);
  if (!next) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}



