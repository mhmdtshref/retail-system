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
  const etag = `W/"stock:${locationId || 'all'}:${out.length}:${out.map(r=>r.available).join(',').slice(0,128)}"`;
  const res = NextResponse.json({ availability: out });
  res.headers.set('ETag', etag);
  res.headers.set('Cache-Control', 'public, max-age=15');
  return res;
}
