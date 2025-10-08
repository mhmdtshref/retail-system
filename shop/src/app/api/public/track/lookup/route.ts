import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Idempotency } from '@/lib/models/Idempotency';
import { mockDb } from '@/lib/mock/store';
import { normalizeToE164 } from '@/lib/phone';
import { webcrypto as crypto } from 'crypto';

const InputSchema = z.object({ orderCode: z.string().min(4).max(12), emailOrPhone: z.string().min(3) });

const MAX_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function hash(input: string) {
  const enc = new TextEncoder();
  const data = enc.encode(input + (process.env.TRACK_SECRET || 'dev-track-secret'));
  const buf = await crypto.subtle.digest('SHA-256', data);
  const bytes = Buffer.from(new Uint8Array(buf));
  return bytes.toString('hex');
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json().catch(() => ({}));
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { orderCode, emailOrPhone } = parsed.data;

  // Attempt to find order by code using mock store
  const sale = mockDb.listSales({ receipt: orderCode })[0];
  if (!sale) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const customer = sale.customerId ? mockDb.getCustomer(sale.customerId) : null;
  const inputLower = emailOrPhone.toLowerCase();
  const phone = customer?.phone || '';
  const email = customer?.email || '';
  const phoneNorm = normalizeToE164(phone).e164 || '';
  const inputPhoneNorm = normalizeToE164(inputLower).e164 || '';

  const key = `track:lookup:${orderCode}`;
  const rec = (await Idempotency.findOne({ key }).lean()) as any;
  const now = Date.now();
  if (rec && rec.result?.lockedUntil && now < rec.result.lockedUntil) {
    return NextResponse.json({ error: 'locked' }, { status: 429 });
  }

  const match = (email && email.toLowerCase() === inputLower) || (phoneNorm && inputPhoneNorm && phoneNorm === inputPhoneNorm);
  if (!match) {
    const attempts = (rec?.result?.attempts || 0) + 1;
    const lockedUntil = attempts >= MAX_ATTEMPTS ? now + LOCK_WINDOW_MS : undefined;
    await Idempotency.updateOne(
      { key },
      { $set: { result: { attempts, lockedUntil, updatedAt: now } } },
      { upsert: true }
    );
    return NextResponse.json({ error: 'mismatch' }, { status: 401 });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpKey = `track:otp:${orderCode}`;
  const otpHash = await hash(otp);
  await Idempotency.updateOne(
    { key: otpKey },
    { $set: { result: { otpHash, orderId: sale._id, expiresAt: now + OTP_TTL_MS, attempts: 0 } } },
    { upsert: true }
  );

  // In a real system we'd send via email/SMS relay webhooks in settings
  return NextResponse.json({ pendingOtp: true, debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined });
}

