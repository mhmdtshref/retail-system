"use client";
import { Box, Button, Typography } from '@mui/material';

export default function OfflinePage() {
  return (
    <Box component="main" dir="rtl" sx={{ p: 2, maxWidth: 720 }}>
      <Typography variant="h6" fontWeight={600}>لا يوجد اتصال</Typography>
      <Typography sx={{ mt: 1 }} color="text.secondary">بعض الصفحات تتطلب اتصالاً بالإنترنت. يمكنك استخدام صفحة نقطة البيع دون اتصال.</Typography>
      <Button sx={{ mt: 2 }} variant="outlined" onClick={() => location.reload()}>
        جرّب إعادة المحاولة
      </Button>
    </Box>
  );
}

