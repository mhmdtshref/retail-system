import { NextRequest } from 'next/server';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { dbConnect } from '@/lib/db/mongo';
import { User } from '@/lib/models/User';

export type SessionUser = { id: string; role: 'owner'|'manager'|'cashier'|'staff'|'viewer'; name?: string; email: string; status: 'active'|'disabled' };

export async function getSessionUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const { userId } = getAuth(req);
  if (!userId) return null;
  let email = '';
  try {
    const cu = await clerkClient.users.getUser(userId);
    email = cu?.emailAddresses?.[0]?.emailAddress || '';
  } catch {}
  await dbConnect();
  const query = email ? { $or: [ { clerkId: userId }, { email } ] } : { clerkId: userId };
  const user: any = await User.findOne(query).lean();
  if (!user) return { id: userId, email, role: 'viewer', status: 'active' } as any;
  if (user.status !== 'active') return { id: String(user._id || userId), email: user.email, role: user.role, name: user.name, status: user.status };
  return { id: String(user._id || userId), email: user.email, role: user.role, name: user.name, status: 'active' };
}
