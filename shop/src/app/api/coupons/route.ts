import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { Coupon } from '@/lib/models/Coupon';

export async function GET(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (code) {
    const doc = await Coupon.findOne({ code: new RegExp(`^${code}$`, 'i') }).lean();
    if (!doc) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ coupon: doc });
  }
  const items = await Coupon.find({}).limit(100).lean();
  return NextResponse.json({ coupons: items });
}
