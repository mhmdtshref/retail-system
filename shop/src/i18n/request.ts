import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { locales, Locale, defaultLocale } from './config';

export default getRequestConfig(async ({ locale }) => {
  const l = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
  if (!locales.includes(l)) notFound();
  return {
    locale: l,
    messages: (await import(`./messages/${l}.json`)).default
  } as const;
});

