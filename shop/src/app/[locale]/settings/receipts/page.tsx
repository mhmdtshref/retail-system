"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReceiptsForm } from '@/components/settings/ReceiptsForm';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

export default function SettingsReceiptsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>('viewer');
  useEffect(() => { (async () => { try { const res = await fetch('/api/auth/self'); if (res.ok) { const data = await res.json(); setRole(data?.user?.role || 'viewer'); } } catch {} })(); }, []);
  if (!(role === 'owner' || role === 'manager')) return <Box component="main" sx={{ p: 2 }}><Paper variant="outlined" sx={{ p: 2, color: 'error.main' }}>مرفوض: يتطلب صلاحيات مدير</Paper></Box>;
  return (
    <Box component="main" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper variant="outlined" sx={{ position: 'sticky', top: 0, zIndex: (t)=> t.zIndex.appBar, p: 1 }}>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => router.push('/settings/payments')} variant="outlined" size="small">المدفوعات</Button>
          <Button onClick={() => router.push('/settings/locales')} variant="outlined" size="small">اللغة والتنسيق</Button>
          <Button onClick={() => router.push('/settings/receipts')} variant="outlined" size="small">الإيصالات</Button>
        </Stack>
      </Paper>
      <ReceiptsForm />
    </Box>
  );
}

