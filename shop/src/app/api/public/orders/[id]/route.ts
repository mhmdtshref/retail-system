import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { verifyTrackToken } from '@/lib/public/tokens';
import { composeOrderTracking } from '@/lib/track/compose';
import { sanitizeShipment } from '@/lib/public/sanitize';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  const token = req.nextUrl.searchParams.get('t') || '';
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  try {
    const { orderId } = await verifyTrackToken(token);
    if (orderId !== id) return NextResponse.json({ error: 'Invalid token scope' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const composed = await composeOrderTracking(id);
  if (!composed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const shipments = (composed.shipments || []).map((s: any) => sanitizeShipment(s));
  const header = {
    orderId: id,
    code: String((composed.order as any)._id || '').slice(-6),
    placedAt: (composed.order as any).createdAt,
    status: composed.overallStatus,
    progressPct: composed.progressPct
  };
  return NextResponse.json({ header, shipments, items: composed.items, payments: composed.payments, shippingTo: composed.shippingTo });
}

