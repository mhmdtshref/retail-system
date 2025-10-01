import { NextResponse } from 'next/server';

export function GET() {
  const locale = 'ar';
  const body = {
    name: locale === 'ar' ? 'متجر الملابس' : 'Clothing Shop',
    short_name: locale === 'ar' ? 'المتجر' : 'Shop',
    description: locale === 'ar' ? 'تطبيق نقطة بيع يعمل دون اتصال' : 'Offline-first POS application',
    start_url: `/${locale}`,
    display: 'standalone',
    lang: locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    background_color: '#111827',
    theme_color: '#111827',
    prefer_related_applications: false,
    categories: ['shopping', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
  return NextResponse.json(body);
}

