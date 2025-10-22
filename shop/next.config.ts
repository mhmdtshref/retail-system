import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Point the plugin to the request config that loads messages
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Force Dexie to resolve to its ESM entry in client bundles
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      dexie$: require('path').resolve(__dirname, 'node_modules/dexie/dist/dexie.mjs'),
    };
    return config;
  },
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
