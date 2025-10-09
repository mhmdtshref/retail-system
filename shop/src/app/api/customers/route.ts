import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { Customer } from '@/lib/models/Customer';
import { CustomerCreateSchema } from '@/lib/validators/customer';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { normalizeArabicName, normalizeEnglishName, digitsOnly } from '@/lib/arabic/normalize';
import { detectDuplicates } from '@/lib/customers/duplicates';
import { withRateLimit } from '@/lib/security/rate-limit';
import { verifyCsrf } from '@/lib/security/csrf';
import { writeAudit } from '@/lib/security/audit';

const ListQuery = z.object({
  q: z.string().optional(),
  phone: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional()
});

function buildSearchQuery(q?: string, phone?: string) {
  const query: any = {};
  if (phone) {
    const digits = digitsOnly(phone);
    if (digits) {
      query.$or = [
        { 'phones.e164': new RegExp(`\\+?${digits}$`) },
        { 'search.phone_index': { $in: [digits] } }
      ];
    }
    return query;
  }
  if (q) {
    const ar = normalizeArabicName(q);
    const en = normalizeEnglishName(q);
    const or: any[] = [];
    if (ar) {
      or.push({ 'search.name_ar_norm': { $regex: `^${escapeRegex(ar)}` } });
    }
    if (en) {
      or.push({ 'search.name_en_norm': { $regex: `^${escapeRegex(en)}` } });
    }
    if (or.length) query.$or = or;
  }
  return query;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const parsed = ListQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { q, phone, limit, cursor } = parsed.data;
  const query = buildSearchQuery(q, phone);
  const find: any = Customer.find(query).sort({ updatedAt: -1 }).limit(limit);
  if (cursor) find.where('_id').lt(cursor);
  const items = await find.lean();
  const final = NextResponse.json({ items, nextCursor: items.length === limit ? String(items[items.length - 1]._id) : undefined });
  return final;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'CUSTOMERS.CREATE');
  if (allowed !== true) return allowed;
  await dbConnect();
  const csrf = verifyCsrf(req);
  if (csrf !== true) return csrf;

  // Rate limit sensitive create
  const limited = await withRateLimit(
    req,
    () => new NextResponse(null, { status: 204 }),
    { limit: 10, windowMs: 5 * 60 * 1000, burst: 5 },
    'api:customers:create',
    String((auth.user as any)?.id || (auth.user as any)?._id || '')
  );
  if (limited && limited.status === 429) {
    await writeAudit({ action: 'notification.send', status: 'denied', actor: { id: String((auth.user as any)?.id || (auth.user as any)?._id || ''), role: (auth.user as any)?.role }, req });
    return limited;
  }
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  const existing = await getIfExists(idempotencyKey);
  if (existing) return NextResponse.json(existing);
  const body = await req.json();
  const parsed = CustomerCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const enriched = enrichWithSearch(parsed.data);
  // duplicate detection
  const candidates = await Customer.find({
    $or: [
      ...(enriched.search?.phone_index?.length ? [{ 'search.phone_index': { $in: enriched.search.phone_index } }] : []),
      ...(enriched.search?.name_ar_norm ? [{ 'search.name_ar_norm': { $regex: `^${escapeRegex(enriched.search.name_ar_norm)}` } }] : []),
      ...(enriched.search?.name_en_norm ? [{ 'search.name_en_norm': { $regex: `^${escapeRegex(enriched.search.name_en_norm)}` } }] : [])
    ]
  }).limit(20).select({ _id: 1, search: 1 }).lean();
  const dups = detectDuplicates({ fullName_ar: enriched.fullName_ar, fullName_en: enriched.fullName_en, phones: enriched.phones }, candidates as any);
  // Create doc
  const doc = await Customer.create(enriched);
  const res = { customer: toClient(doc.toObject()), duplicates: dups };
  await saveResult(idempotencyKey, res);
  await writeAudit({ action: 'user.create', status: 'success', actor: { id: String((auth.user as any)?.id || (auth.user as any)?._id || ''), role: (auth.user as any)?.role }, entity: { type: 'Customer', id: String(doc._id) }, req });
  return NextResponse.json(res);
}

function toClient(c: any) {
  if (!c) return c;
  c.createdAt = new Date(c.createdAt).toISOString();
  c.updatedAt = new Date(c.updatedAt).toISOString();
  return c;
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

