import { NextRequest, NextResponse } from 'next/server';

export function applyCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin') || '';
  const allow = (process.env.CORS_ALLOWLIST || '').split(',').map(s=>s.trim()).filter(Boolean);
  const isAllowed = origin && allow.some(a => origin === a);
  if (isAllowed) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, Idempotency-Key');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.headers.set('Access-Control-Max-Age', '600');
  }
  return res;
}
