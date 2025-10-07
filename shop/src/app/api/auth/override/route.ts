import { NextResponse } from 'next/server';
import { handleOverride } from '@/lib/auth/override';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const res = await handleOverride(body);
  return NextResponse.json(res.json, { status: res.status });
}
