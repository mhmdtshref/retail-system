import { dbConnect } from '@/lib/db/mongo';
import { CarrierAccount } from '@/lib/models/CarrierAccount';
import { CarrierAccountSchema } from '@/lib/validators/carrier';
import { requireAuth, requireCan } from '@/lib/policy/api';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  const doc = await CarrierAccount.findById(id).lean();
  if (!doc) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify(doc), { headers: { 'content-type': 'application/json' } });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const auth = await requireAuth(req as any);
  if ('error' in auth) return auth.error as any;
  const can = await requireCan(req as any, auth.user, 'SETTINGS.MANAGE');
  if (can !== true) return can;
  const { id } = await context.params;
  const body = await req.json();
  const parsed = CarrierAccountSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { 'content-type': 'application/json' } });
  const doc = await CarrierAccount.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
  return new Response(JSON.stringify(doc), { headers: { 'content-type': 'application/json' } });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const auth = await requireAuth(req as any);
  if ('error' in auth) return auth.error as any;
  const can = await requireCan(req as any, auth.user, 'SETTINGS.MANAGE');
  if (can !== true) return can;
  const { id } = await context.params;
  await CarrierAccount.findByIdAndDelete(id);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
}

