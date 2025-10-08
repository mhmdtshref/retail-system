import { dbConnect } from '@/lib/db/mongo';
import { CarrierAccount } from '@/lib/models/CarrierAccount';
import { CarrierAccountSchema } from '@/lib/validators/carrier';
import { requireAuth, requireCan } from '@/lib/policy/api';

export async function GET() {
  await dbConnect();
  const list = await CarrierAccount.find({}).sort({ createdAt: -1 }).lean();
  return new Response(JSON.stringify({ carriers: list }), { headers: { 'content-type': 'application/json' } });
}

export async function POST(req: Request) {
  await dbConnect();
  const auth = await requireAuth(req as any);
  if ('error' in auth) return auth.error as any;
  const can = await requireCan(req as any, auth.user, 'SETTINGS.MANAGE');
  if (can !== true) return can;
  const body = await req.json();
  const parsed = CarrierAccountSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { 'content-type': 'application/json' } });
  const doc = await CarrierAccount.create(parsed.data);
  return new Response(JSON.stringify(doc), { headers: { 'content-type': 'application/json' } });
}

