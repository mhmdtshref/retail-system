import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from './src/i18n/config';
import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security/headers';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '@clerk/nextjs';

const intl = createMiddleware({ locales: Array.from(locales), defaultLocale, localePrefix });

function ipAllowed(ip: string | undefined): boolean {
  const allow = (process.env.ADMIN_IP_ALLOWLIST || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!allow.length) return true;
  if (!ip) return false;
  // Simple exact match or /32
  return allow.some(entry => entry === ip || entry.replace('/32','') === ip);
}

const baseAuth = authMiddleware({
  publicRoutes: [
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/offline',
    '/manifest.webmanifest',
    '/icons(.*)',
    '/api/_health',
  ]
});

export default function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname;
  const res = intl(req);
  let secured = applySecurityHeaders(req, res, { cspImgDomains: ['data:', 'blob:'] });
  const existingReqId = req.headers.get('x-request-id') || '';
  const requestId = existingReqId || randomUUID();
  const correlationId = req.headers.get('x-correlation-id') || requestId;
  secured.headers.set('x-request-id', requestId);
  secured.headers.set('x-correlation-id', correlationId);
  if (path.startsWith('/api/admin') || path.startsWith('/admin')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    if (!ipAllowed(ip)) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: { message: 'مرفوض (IP غير مسموح)' } }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }
  // Delegate to Clerk auth for route protection
  const authRes = baseAuth(req);
  return authRes || secured;
}

export const config = {
  matcher: [
    '/',
    '/((?!_next|offline|manifest\\.webmanifest|sw\\.js|icons|.*\\..*).*)',
    '/api/admin/:path*'
  ],
};

