"use client";
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

export function createEmotionCacheRtl() {
  return createCache({ key: 'mui-rtl', stylisPlugins: [prefixer, rtlPlugin] });
}

export function createEmotionCacheLtr() {
  return createCache({ key: 'mui', stylisPlugins: [prefixer] });
}
