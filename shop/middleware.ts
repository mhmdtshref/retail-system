import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from './src/i18n/config';

export default createMiddleware({
  locales: Array.from(locales),
  defaultLocale,
  localePrefix,
});

export const config = {
  matcher: [
    '/',
    '/((?!_next|api|offline|manifest\\.webmanifest|sw\\.js|icons|.*\\..*).*)',
  ],
};

