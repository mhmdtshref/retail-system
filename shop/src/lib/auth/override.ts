import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { User } from '@/lib/models/User';
import { verifyPassword } from './password';
import { issueOverrideToken } from '@/lib/policy/overrides';

const OverrideSchema = z.object({ managerEmail: z.string().email(), pinOrPassword: z.string().min(4) });

export async function handleOverride(body: unknown) {
  const parsed = OverrideSchema.safeParse(body);
  if (!parsed.success) return { status: 400, json: { error: { message: 'تنسيق غير صالح' } } };
  const { managerEmail, pinOrPassword } = parsed.data;
  await dbConnect();
  const user: any = await User.findOne({ email: managerEmail.toLowerCase(), role: { $in: ['manager','owner'] }, status: 'active' }).lean();
  if (!user) return { status: 403, json: { error: { message: 'غير مصرح' } } };
  const ok = (user.pin && await verifyPassword(pinOrPassword, user.pin)) || await verifyPassword(pinOrPassword, user.hashedPassword);
  if (!ok) return { status: 403, json: { error: { message: 'بيانات غير صحيحة' } } };
  const { token, exp } = await issueOverrideToken({ managerUserId: String(user._id) });
  return { status: 200, json: { token, exp } };
}
