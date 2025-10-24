"use client";
import * as React from 'react';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material';
import { StyledEngineProvider } from '@mui/material/styles';
import { createAppTheme } from '@/lib/theme/mui-theme';
import { createEmotionCacheLtr, createEmotionCacheRtl } from '@/lib/theme/rtl-cache';

export type MuiProvidersProps = {
  children: React.ReactNode;
  mode?: 'light' | 'dark';
  dir?: 'ltr' | 'rtl';
  locale?: string;
};

export function MuiProviders({ children, mode = 'light', dir = 'rtl', locale = 'ar' }: MuiProvidersProps) {
  const cache = React.useMemo(() => (dir === 'rtl' ? createEmotionCacheRtl() : createEmotionCacheLtr()), [dir]);
  const theme = React.useMemo(() => createAppTheme({ mode, dir, locale }), [mode, dir, locale]);

  return (
    <CacheProvider value={cache}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </StyledEngineProvider>
    </CacheProvider>
  );
}
