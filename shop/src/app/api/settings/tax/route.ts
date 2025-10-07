import { NextResponse } from 'next/server';
import { TaxConfigSchema } from '@/lib/validators/tax';

const g = globalThis as unknown as { __taxConfig?: any };
if (!g.__taxConfig) {
  g.__taxConfig = {
    priceMode: 'tax_exclusive',
    defaultRate: 0.15,
    rules: [],
    precision: 2,
    roundingStrategy: 'half_up',
    receiptRounding: 'none',
    cashRounding: { enabled: true, increment: 0.05 }
  };
}

export async function GET() {
  return NextResponse.json(g.__taxConfig);
}

export async function PATCH(req: Request) {
  const idk = req.headers.get('Idempotency-Key') || '';
  const body = await req.json();
  const parsed = TaxConfigSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  // simple in-memory idempotency
  const idem = (globalThis as any).__idem || ((globalThis as any).__idem = new Map());
  if (idk && idem.has(idk)) return NextResponse.json(idem.get(idk));
  g.__taxConfig = parsed.data;
  const res = g.__taxConfig;
  if (idk) idem.set(idk, res);
  return NextResponse.json(res);
}
