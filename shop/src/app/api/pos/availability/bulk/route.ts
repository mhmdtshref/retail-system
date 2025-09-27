import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { skus } = await req.json();
  const now = Date.now();
  const out = (skus as string[]).map((sku) => ({ sku, onHand: 100, reserved: 0, available: 100, asOf: now }));
  return NextResponse.json({ availability: out });
}

