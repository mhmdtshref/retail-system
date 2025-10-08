import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { Layaway } from '@/lib/models/Layaway';
import { Payment } from '@/lib/models/Payment';
import { LayawayPaymentSchema } from '@/lib/validators/layaway';
import { getIfExists, saveResult } from '@/lib/idempotency';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.SALE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const idk = req.headers.get('Idempotency-Key') || '';
  if (!idk) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const existing = await getIfExists(idk);
  if (existing) return NextResponse.json(existing);
  const body = await req.json();
  const parsed = LayawayPaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { amount, method } = parsed.data;
  const lay = await Layaway.findById(params.id);
  if (!lay) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (lay.status === 'completed' || lay.status === 'canceled' || lay.status === 'forfeited') {
    return NextResponse.json({ error: { message: 'لا يمكن إضافة دفعة على حالة نهائية' } }, { status: 400 });
  }
  const payment = await Payment.create({ saleId: lay.saleId, method, amount, seq: (lay.payments?.length || 0) + 1 });
  const paidBefore = lay.totals.upfrontPaid + (lay.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
  const paidAfter = paidBefore + amount;
  const balance = Math.max(0, lay.totals.grandTotal - paidAfter);
  lay.payments = [...(lay.payments || []), { paymentId: String(payment._id), method, amount, at: new Date(payment.receivedAt || Date.now()).toISOString() }];
  lay.totals.balance = balance;
  lay.lastPaymentAt = new Date().toISOString();
  if (balance <= 0) {
    lay.status = 'completed';
    lay.completedAt = new Date().toISOString();
  }
  await lay.save();
  const res = { ok: true, balance: lay.totals.balance, status: lay.status, paymentId: String(payment._id) };
  await saveResult(idk, res);
  return NextResponse.json(res);
}

