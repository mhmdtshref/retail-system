import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Point the plugin to the request config that loads messages
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
