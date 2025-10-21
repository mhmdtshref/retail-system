import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from '@/i18n/config';
import { NextRequest } from 'next/server';
import { applySecurityHeaders } from '@/lib/security/headers';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const intl = createMiddleware({ locales: Array.from(locales), defaultLocale, localePrefix });
const isProtectedRoute = createRouteMatcher([
  '/(ar|en)/(pos|inventory|products|promotions|purchase-orders|delivery|returns|sales|settings|reports)(/.*)?',
  '/(pos|inventory|products|promotions|purchase-orders|delivery|returns|sales|settings|reports)(/.*)?',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  let res = intl(req);
  res = applySecurityHeaders(req, res, { cspImgDomains: ['data:', 'blob:'] });
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
    '/',
    '/((?!_next|api|auth|offline|manifest\\.webmanifest|sw\\.js|icons|.*\\..*).*)',
  ],
};
