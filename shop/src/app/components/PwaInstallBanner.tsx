"use client";
import { useEffect, useState } from 'react';
import { useInstallPrompt, isIosSafari } from '@/lib/pwa/install';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

export function PwaInstallBanner() {
  const install = useInstallPrompt();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onShow = () => setShow(true);
    window.addEventListener('pwa:show-install', onShow);
    return () => window.removeEventListener('pwa:show-install', onShow);
  }, []);
  if (!show) return null;
  return (
    <Box dir="rtl" sx={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: (t)=> t.zIndex.snackbar }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>أضِف التطبيق للشاشة الرئيسية لتجربة أسرع دون اتصال.</Typography>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button variant="outlined" size="small" onClick={() => setShow(false)}>إغلاق</Button>
          <Button variant="contained" size="small" onClick={async () => { await install.prompt(); setShow(false); }}>إضافة</Button>
        </Stack>
      </Paper>
    </Box>
  );
}

export function IosAddToHomeSheet() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onShow = () => setShow(true);
    if (isIosSafari()) setShow(true);
    window.addEventListener('pwa:show-ios-guide', onShow);
    return () => window.removeEventListener('pwa:show-ios-guide', onShow);
  }, []);
  if (!show) return null;
  return (
    <Box dir="rtl" sx={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: (t)=> t.zIndex.snackbar }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>على iOS: اضغط على مشاركة ثم «أضِف إلى الشاشة الرئيسية».</Typography>
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="outlined" size="small" onClick={() => setShow(false)}>حسناً</Button>
        </Stack>
      </Paper>
    </Box>
  );
}


