import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { isRTL } from '@/i18n/config';
import '@/app/globals.css';
import { Cairo, Tajawal } from 'next/font/google';

const tajawal = Tajawal({ subsets: ['arabic'], weight: ['400','700'], variable: '--font-arabic' });
const cairo = Cairo({ subsets: ['arabic'], weight: ['400','700'], variable: '--font-arabic-2' });

export const metadata: Metadata = {
  title: 'Clothing Shop',
  description: 'PWA POS with offline-first design',
  manifest: '/manifest.webmanifest'
};

export default async function LocaleLayout(props: any) {
  const { children } = props as { children: React.ReactNode };
  const params = await (props as { params: any }).params;
  const locale: string = (params && params.locale) || 'ar';
  const messages = await getMessages();
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Riyadh">
      <div dir={dir} className={`${tajawal.variable} ${cairo.variable} antialiased`}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}

