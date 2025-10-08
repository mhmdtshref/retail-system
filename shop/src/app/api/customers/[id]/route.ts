import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Customer } from '@/lib/models/Customer';
import { CustomerUpdateSchema } from '@/lib/validators/customer';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { normalizeArabicName, normalizeEnglishName, digitsOnly } from '@/lib/arabic/normalize';

const IdParam = z.object({ id: z.string().min(1) });

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  const doc = await Customer.findById(id).lean();
  if (!doc) return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  (doc as any).createdAt = new Date((doc as any).createdAt).toISOString();
  (doc as any).updatedAt = new Date((doc as any).updatedAt).toISOString();
  return NextResponse.json({ customer: doc });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'CUSTOMERS.UPDATE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  const existing = await getIfExists(idempotencyKey);
  if (existing) return NextResponse.json(existing);
  const { id } = await context.params;
  const body = await req.json();
  const parsed = CustomerUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = await Customer.findByIdAndUpdate(id, enrichWithSearch(parsed.data), { new: true }).lean();
  if (!updated) return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  (updated as any).createdAt = new Date((updated as any).createdAt).toISOString();
  (updated as any).updatedAt = new Date((updated as any).updatedAt).toISOString();
  const res = { customer: updated };
  await saveResult(idempotencyKey, res);
  return NextResponse.json(res);
}

function enrichWithSearch(input: any) {
  const fullAr = input.fullName_ar || [input.firstName_ar, input.lastName_ar].filter(Boolean).join(' ').trim();
  const fullEn = input.fullName_en || [input.firstName_en, input.lastName_en].filter(Boolean).join(' ').trim();
  const name_ar_norm = normalizeArabicName(fullAr || '');
  const name_en_norm = normalizeEnglishName(fullEn || '');
  const phone_index = Array.from(new Set((input.phones || []).map((p: any) => digitsOnly(p.e164)).filter(Boolean)));
  return {
    ...input,
    fullName_ar: fullAr || undefined,
    fullName_en: fullEn || undefined,
    search: { name_ar_norm, name_en_norm, phone_index }
  };
}

