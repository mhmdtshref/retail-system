import { locales, defaultLocale, localePrefix } from './src/i18n/config';
import { getRequestConfig, type RequestConfig } from 'next-intl/server';

export default {
  locales: Array.from(locales),
  defaultLocale,
  localePrefix,
  // Delegate loading messages to our existing request config
  messages: getRequestConfig(async ({ locale }): Promise<RequestConfig> => {
    const l = (Array.from(locales).includes(locale as any) ? locale : defaultLocale) as string;
    const messages = (await import(`./src/i18n/messages/${l}.json`)).default;
    return { locale: l, messages } as unknown as RequestConfig;
  })
} as const;


