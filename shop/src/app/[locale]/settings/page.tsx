"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

export default function SettingsIndexPage() {
  const [role, setRole] = useState<string>('viewer');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self');
        if (res.ok) {
          const data = await res.json();
          setRole(data?.user?.role || 'viewer');
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Box component="main" sx={{ p: 2 }}>...تحميل</Box>;
  if (!(role === 'owner' || role === 'manager')) {
    return <Box component="main" sx={{ p: 2 }}><Paper variant="outlined" sx={{ p: 2, color: 'error.main' }}>مرفوض: يتطلب صلاحيات مدير</Paper></Box>;
  }

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600}>الإعدادات</Typography>
      <Paper variant="outlined" sx={{ p: 1, position: 'sticky', top: 0, zIndex: 10 }}>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => window.location.href='/settings/payments'} variant="outlined">المدفوعات</Button>
          <Button onClick={() => window.location.href='/settings/locales'} variant="outlined">اللغة والتنسيق</Button>
          <Button onClick={() => window.location.href='/settings/receipts'} variant="outlined">الإيصالات</Button>
          <Button onClick={() => window.location.href='/settings/accounting'} variant="outlined">المحاسبة</Button>
          <Button onClick={() => window.location.href='/settings/notifications'} variant="outlined">الإشعارات</Button>
          <Button onClick={() => window.location.href='/settings/observability'} variant="outlined">المراقبة</Button>
        </Stack>
      </Paper>
      <Typography variant="body2" color="text.secondary">اختر تبويبًا أعلاه لعرض الإعدادات.</Typography>
    </Box>
  );
}

