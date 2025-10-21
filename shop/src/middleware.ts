import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from '@/i18n/config';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequestEdge } from '@/lib/auth/session-edge';
import { ROUTE_RULES } from '@/lib/policy/route-config';
import { minRole as hasMinRole } from '@/lib/policy/guard';
import { applySecurityHeaders } from '@/lib/security/headers';

const intl = createMiddleware({ locales: Array.from(locales), defaultLocale, localePrefix });

const PROTECTED_PREFIXES = [
  /^\/(ar|en)\/(pos|inventory|products|promotions|purchase-orders|delivery|returns|sales|settings|reports)(\/.*)?$/, // locale prefixed
  /^\/(pos|inventory|products|promotions|purchase-orders|delivery|returns|sales|settings|reports)(\/.*)?$/ // non-locale (fallback)
];

export default async function middleware(req: NextRequest) {
  let res = intl(req);

  const url = new URL(req.url);
  const pathname = url.pathname;

  // Security headers for all requests (including public)
  res = applySecurityHeaders(req, res, { cspImgDomains: ['data:', 'blob:'] });
  // Set CSRF token if missing
  const csrfCookie = req.cookies.get('csrf-token');
  if (!csrfCookie) {
    const token = Math.random().toString(36).slice(2);
    res.cookies.set('csrf-token', token, { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 });
  }

  const needsAuth = PROTECTED_PREFIXES.some((re) => re.test(pathname));
  if (!needsAuth) return res;

  const user = await getSessionUserFromRequestEdge(req);
  if (!user || user.status !== 'active') {
    const loginUrl = new URL('/auth/login', req.url);
    return NextResponse.redirect(loginUrl);
  }
  // Optional per-route minRole checks
  const rule = ROUTE_RULES.find((r) => r.pattern.test(pathname));
  if (rule && rule.minRole && !hasMinRole(user as any, rule.minRole)) {
    const loginUrl = new URL('/auth/login', req.url);
    return NextResponse.redirect(loginUrl);
  }
  return res;
}

export const config = {
  matcher: [
    '/',
    // Exclude auth paths from locale prefixing and auth checks
    '/((?!_next|api|auth|offline|manifest\\.webmanifest|sw\\.js|icons|.*\\..*).*)',
  ],
};
