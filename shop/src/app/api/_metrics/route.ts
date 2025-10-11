import { NextRequest, NextResponse } from 'next/server';
import { exportProm } from '@/lib/obs/metrics';
import { requireAuth } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';

export async function GET(req: NextRequest) {
  const exposePublic = (process.env.OBS_METRICS_PUBLIC || '').toLowerCase() === 'true';
  if (!exposePublic) {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    if (!minRole(auth.user, 'manager')) {
      return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات مدير' } }, { status: 403 });
    }
  }
  const body = exportProm();
  return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8', 'Cache-Control': 'no-store' } });
}
