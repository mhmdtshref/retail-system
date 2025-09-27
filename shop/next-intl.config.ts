import { locales, defaultLocale, localePrefix } from './src/i18n/config';
import { getRequestConfig } from 'next-intl/server';

export default {
  locales: Array.from(locales),
  defaultLocale,
  localePrefix,
  // Delegate loading messages to our existing request config
  messages: getRequestConfig(async ({ locale }) => {
    const l = Array.from(locales).includes(locale as any) ? locale : defaultLocale;
    return {
      locale: l,
      messages: (await import(`./src/i18n/messages/${l}.json`)).default
    } as const;
  })
} as const;


