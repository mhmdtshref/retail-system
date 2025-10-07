import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req);
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user }, { status: 200 });
}
