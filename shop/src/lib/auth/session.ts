import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { User } from '@/lib/models/User';

export type SessionUser = { id: string; role: 'owner'|'manager'|'cashier'|'staff'|'viewer'; name?: string; email: string; status: 'active'|'disabled' };

export async function getSessionUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret';
  const token = await getToken({ req, secret });
  if (!token || !token.sub) return null;
  await dbConnect();
  const user: any = await User.findById(token.sub).lean();
  if (!user) return null;
  if (user.status !== 'active') return { id: String(user._id), email: user.email, role: user.role, name: user.name, status: user.status };
  return { id: String(user._id), email: user.email, role: user.role, name: user.name, status: 'active' };
}
