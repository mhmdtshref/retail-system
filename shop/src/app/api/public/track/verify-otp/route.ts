import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Idempotency } from '@/lib/models/Idempotency';
import { signTrackToken } from '@/lib/public/tokens';
import { webcrypto as crypto } from 'crypto';

const InputSchema = z.object({ orderCode: z.string().min(4).max(12), otp: z.string().min(4).max(8) });

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
  const { orderCode, otp } = parsed.data;
  const rec = (await Idempotency.findOne({ key: `track:otp:${orderCode}` }).lean()) as any;
  if (!rec || !rec.result) return NextResponse.json({ error: 'expired' }, { status: 410 });
  const now = Date.now();
  if (rec.result.expiresAt && now > rec.result.expiresAt) return NextResponse.json({ error: 'expired' }, { status: 410 });
  const attempts = (rec.result.attempts || 0) + 1;
  if (attempts > 10) return NextResponse.json({ error: 'too_many' }, { status: 429 });
  const given = await hash(otp);
  if (given !== rec.result.otpHash) {
    await Idempotency.updateOne({ key: `track:otp:${orderCode}` }, { $set: { 'result.attempts': attempts } });
    return NextResponse.json({ error: 'invalid' }, { status: 401 });
  }
  const orderId = rec.result.orderId as string;
  const { token, exp } = await signTrackToken({ orderId });
  // Invalidate OTP after success
  await Idempotency.deleteOne({ key: `track:otp:${orderCode}` });
  return NextResponse.json({ trackToken: token, exp, orderId });
}

