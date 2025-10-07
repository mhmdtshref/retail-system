import { NextResponse } from 'next/server';
import { CurrencyConfigSchema } from '@/lib/validators/currency';

const g = globalThis as unknown as { __currencyConfig?: any };
if (!g.__currencyConfig) {
  g.__currencyConfig = { defaultCurrency: 'SAR', displayLocale: 'ar-SA', allowFxNote: false };
}

export async function GET() {
  return NextResponse.json(g.__currencyConfig);
}

export async function PATCH(req: Request) {
  const idk = req.headers.get('Idempotency-Key') || '';
  const body = await req.json();
  const parsed = CurrencyConfigSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const idem = (globalThis as any).__idem || ((globalThis as any).__idem = new Map());
  if (idk && idem.has(idk)) return NextResponse.json(idem.get(idk));
  g.__currencyConfig = parsed.data;
  const res = g.__currencyConfig;
  if (idk) idem.set(idk, res);
  return NextResponse.json(res);
}
