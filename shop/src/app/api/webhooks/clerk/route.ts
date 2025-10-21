import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { dbConnect } from '@/lib/db/mongo';
import { User } from '@/lib/models/User';
import { writeAudit } from '@/lib/security/audit';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const h = headers();
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: { message: 'Missing secret' } }, { status: 500 });
  const wh = new Webhook(secret);
  try {
    wh.verify(payload, {
      'svix-id': h.get('svix-id') || '',
      'svix-timestamp': h.get('svix-timestamp') || '',
      'svix-signature': h.get('svix-signature') || ''
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const evt = JSON.parse(payload);
  const type: string = evt.type || '';
  const data = evt.data || {};
  await dbConnect();

  if (type === 'user.created' || type === 'user.updated') {
    const clerkId = data.id as string;
    const email = (data.email_addresses?.[0]?.email_address || data.primary_email_address_id || '').toString().toLowerCase();
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || '';
    const role = (data.public_metadata?.role || 'viewer') as any;
    const res = await User.findOneAndUpdate(
      { $or: [ { clerkId }, { email } ] },
      { $set: { clerkId, email, name, role, status: 'active' } },
      { upsert: true, new: true }
    );
    await writeAudit({ action: 'user.sync', status: 'success', entity: { type: 'User', id: String(res._id) }, meta: { role, type } as any });
  } else if (type === 'user.deleted') {
    const clerkId = data.id as string;
    const res = await User.findOneAndUpdate({ clerkId }, { $set: { status: 'disabled' } }, { new: true });
    if (res) await writeAudit({ action: 'user.delete', status: 'success', entity: { type: 'User', id: String(res._id) } });
  } else if (type === 'session.created') {
    const clerkId = data.user_id as string;
    await User.findOneAndUpdate({ clerkId }, { $set: { lastLoginAt: new Date() } });
  }

  return NextResponse.json({ ok: true });
}
