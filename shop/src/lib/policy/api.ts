import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth/session';
import { can, type SessionUser } from './guard';
import type { Action } from './policies';
import { verifyOverrideToken } from './overrides';

export async function requireAuth(req: NextRequest): Promise<{ user: SessionUser } | { error: NextResponse }>{
  const user = await getSessionUserFromRequest(req);
  if (!user || user.status !== 'active') {
    return { error: NextResponse.json({ error: { message: 'غير مصرح' } }, { status: 401 }) } as any;
  }
  return { user } as any;
}

export async function requireCan(req: NextRequest, user: SessionUser, action: Action): Promise<true | NextResponse> {
  if (can(user, action)) return true;
  // Check override token header for sensitive actions
  const override = req.headers.get('X-Override-Token');
  if (override) {
    try {
      const payload = await verifyOverrideToken(override);
      if (payload && payload.sub) return true;
    } catch {}
  }
  return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات إضافية' } }, { status: 403 });
}
