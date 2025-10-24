import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from '@/i18n/config';
import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security/headers';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const intl = createMiddleware({ locales: Array.from(locales), defaultLocale, localePrefix });
const isProtectedRoute = createRouteMatcher([
  '/(ar|en)/(pos|inventory|products|promotions|purchase-orders|delivery|returns|sales|settings|reports)(/.*)?',
  '/(pos|inventory|products|promotions|purchase-orders|delivery|returns|sales|settings|reports)(/.*)?',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname || '';
  const isApiLike = pathname.startsWith('/api') || pathname.startsWith('/trpc');
  // Run i18n proxy only for web routes, not API-like paths
  let res = isApiLike ? NextResponse.next() : intl(req);
  res = applySecurityHeaders(req, res, {
    cspImgDomains: ['data:', 'blob:'],
    // Allow Clerk assets and connections
    scriptSrcDomains: ['https://clerk.com', 'https://*.clerk.com', 'https://*.clerk.services'],
    connectSrcDomains: ['https://*.clerk.com', 'https://*.clerk.services'],
    frameSrcDomains: ['https://*.clerk.com', 'https://*.clerk.services'],
  });
  if (isProtectedRoute(req)) {
    const session = await auth();
    if (!session.userId) {
      return session.redirectToSignIn();
    }
  }
  return res;
});

export const config = {
  matcher: [
    // All routes except static files and _next
    '/((?!.*\\..*|_next).*)',
    // Also run on API/TRPC so Clerk can set auth state
    '/(api|trpc)(.*)'
  ],
};


