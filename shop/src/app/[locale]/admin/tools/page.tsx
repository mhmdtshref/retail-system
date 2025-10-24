"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';
import { isAdminToolsEnabled } from '@/lib/flags';
import { Box, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';

export default function AdminToolsPage() {
  const t = (s: string) => {
    try { return (window as any).__messages?.adminTools?.[s] || s; } catch { return s; }
  };
  const [role, setRole] = useState<string>('viewer');
  const [enabled, setEnabled] = useState<boolean>(false);
  const [tab, setTab] = useState<'fixes'|'replays'|'idemp'>('fixes');
  const locale = useLocale();

  useEffect(() => { (async () => {
    try {
      const res = await fetch('/api/auth/self');
      if (res.ok) { const data = await res.json(); setRole(data?.user?.role || 'viewer'); }
    } catch {}
    try { setEnabled(isAdminToolsEnabled()); } catch { setEnabled(false); }
  })(); }, []);

  if (!enabled) {
    return <Box component="main" sx={{ p: 2 }} dir="rtl"><Paper variant="outlined" sx={{ p: 2, color: 'text.secondary' }}>هذه الأداة غير متاحة</Paper></Box>;
  }
  if (!(role === 'owner' || role === 'manager')) {
    return <Box component="main" sx={{ p: 2 }} dir="rtl"><Paper variant="outlined" sx={{ p: 2, color: 'error.main' }}>مرفوض: يتطلب صلاحيات مدير</Paper></Box>;
  }

  return (
    <Box component="main" sx={{ p: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>أدوات المدير</Typography>
      <Tabs value={tab} onChange={(_e, v)=> setTab(v)}>
        <Tab value="fixes" label="إصلاح البيانات" />
        <Tab value="replays" label="إعادة التشغيل" />
        <Tab value="idemp" label="المعرِّف الأحادي" />
      </Tabs>
      <Stack spacing={2} sx={{ mt: 2 }}>
        {tab==='fixes' && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>إصلاح البيانات</Typography>
            <Typography variant="caption" color="text.secondary">تشغيل جاف: يعرض الفروقات فقط.</Typography>
            <Box sx={{ mt: 2 }}>{typeof window !== 'undefined' && <DynamicFixWizard />}</Box>
          </Paper>
        )}
        {tab==='replays' && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>إعادة التشغيل</Typography>
            <Typography variant="caption" color="text.secondary">عرض وإعادة محاولة الوظائف الفاشلة.</Typography>
            <Box sx={{ mt: 2 }}>{typeof window !== 'undefined' && <DynamicReplayTable />}</Box>
          </Paper>
        )}
        {tab==='idemp' && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>المعرِّف الأحادي</Typography>
            <Typography variant="caption" color="text.secondary">بحث وإعادة التشغيل بمفتاح جديد.</Typography>
            <Box sx={{ mt: 2 }}>{typeof window !== 'undefined' && <DynamicIdempSearch />}</Box>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

const DynamicFixWizard = dynamic(() => import('@/components/admin/tools/FixWizard'), { ssr: false });
const DynamicReplayTable = dynamic(() => import('@/components/admin/tools/ReplayTable'), { ssr: false });
const DynamicIdempSearch = dynamic(() => import('@/components/admin/tools/IdempotencySearch'), { ssr: false });
