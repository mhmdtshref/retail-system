import { NextResponse } from 'next/server';

export function GET() {
  const body = {
    name: 'Clothing Shop POS',
    short_name: 'Shop POS',
    description: 'Offline-first POS for clothing shop',
    start_url: '/ar',
    display: 'standalone',
    lang: 'ar',
    background_color: '#111827',
    theme_color: '#111827',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
  return NextResponse.json(body);
}

