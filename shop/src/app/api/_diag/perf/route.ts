import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { getRecentSlow, getStats } from '@/lib/profiler';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'ADMIN.PERF');
  if (allowed !== true) return allowed;
  const slow = getRecentSlow();
  const stats = getStats();
  const res = NextResponse.json({ slow, stats });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
