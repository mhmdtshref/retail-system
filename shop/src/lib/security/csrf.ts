import { NextRequest, NextResponse } from 'next/server';

// Double-submit cookie approach for API routes. For browsers, require custom header to bypass preflight issues.
// CSRF is enforced only for state-changing methods.
export function getCsrfTokenFromCookies(req: NextRequest): string | undefined {
  const cookie = req.cookies.get('csrf-token');
  return cookie?.value;
}

export function verifyCsrf(req: NextRequest): true | NextResponse {
  const method = req.method.toUpperCase();
  if (!['POST','PUT','PATCH','DELETE'].includes(method)) return true;
  const header = req.headers.get('x-csrf-token') || '';
  const cookie = getCsrfTokenFromCookies(req) || '';
  if (!cookie || !header || cookie !== header) {
    return NextResponse.json({ error: { message: 'تم رفض الطلب (CSRF)' } }, { status: 403 });
  }
  return true;
}

export function setCsrfCookie(res: NextResponse, token: string) {
  res.cookies.set('csrf-token', token, {
    httpOnly: false, // must be readable by client to echo in header
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });
}
