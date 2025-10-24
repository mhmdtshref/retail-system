"use client";
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Box, Button, Stack, Typography } from '@mui/material';

export default function ReportsHub() {
  const t = useTranslations('reports');
  const router = useRouter();
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600}>{t('title')}</Typography>
      <Stack direction="row" spacing={1}>
        <Button onClick={() => router.push('/reports/daily')} variant="outlined">{t('daily')}</Button>
        <Button onClick={() => router.push('/reports/aging')} variant="outlined">{t('aging')}</Button>
        <Button onClick={() => router.push('/reports/valuation')} variant="outlined">{t('valuation')}</Button>
      </Stack>
    </Box>
  );
}

