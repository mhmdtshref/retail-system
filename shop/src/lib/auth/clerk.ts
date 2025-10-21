import { NextRequest, NextResponse } from 'next/server';
import { auth as clerkAuth, getAuth, currentUser } from '@clerk/nextjs/server';
import { dbConnect } from '@/lib/db/mongo';
import { User, type Role } from '@/lib/models/User';

export type CurrentUser = { id: string; email: string; name?: string; role: Role; status: 'active'|'disabled' };

export function requireUser(): { userId: string } {
  const { userId } = clerkAuth();
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  return { userId };
}

export async function requireRole(min: Role | Role[], req?: NextRequest): Promise<CurrentUser | NextResponse> {
  const allowed: Role[] = Array.isArray(min) ? min : [min];
  const me = await getCurrentUser(req);
  if (!me) return NextResponse.json({ error: { message: 'غير مصرح' } }, { status: 401 });
  const order: Role[] = ['viewer','staff','cashier','manager','owner'];
  if (allowed.some(r => order.indexOf(me.role) >= order.indexOf(r))) return me;
  return NextResponse.json({ error: { message: 'مرفوض: يتطلب صلاحيات إضافية' } }, { status: 403 });
}

export async function getCurrentUser(req?: NextRequest): Promise<CurrentUser | null> {
  const auth = req ? getAuth(req) : clerkAuth();
  const userId = auth.userId;
  if (!userId) return null;

  const cu = await currentUser().catch(() => null);
  const email = cu?.emailAddresses?.[0]?.emailAddress || '';
  const name = cu?.fullName || cu?.username || undefined;
  const metaRole = (cu?.publicMetadata as any)?.role as Role | undefined;

  await dbConnect();
  const dbUser: any = await User.findOne({ $or: [ { clerkId: userId }, { email } ] }).lean();
  const role: Role = metaRole || dbUser?.role || 'viewer';
  const status: 'active'|'disabled' = dbUser?.status || 'active';
  const id = dbUser? String(dbUser._id) : userId;
  return { id, email, name, role, status };
}
