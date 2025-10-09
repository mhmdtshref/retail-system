import { NextRequest, NextResponse } from 'next/server';
import { getAvailabilityBulk } from '@/lib/inventory/availability';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const locationId = url.searchParams.get('locationId') || undefined;
  const q = (url.searchParams.get('q') || '').trim();
  const skus = url.searchParams.getAll('skus');
  // For simplicity, expect skus[] or q as comma-separated
  const list = skus.length ? skus : (q ? q.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const map = await getAvailabilityBulk(list as string[], { locationId });
  const out = (list as string[]).map((sku) => ({ sku, ...map[sku] }));
  return NextResponse.json({ availability: out });
}
