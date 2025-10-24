import React from 'react';
import { Box, Typography } from '@mui/material';

export default function LayawayDetailPage() {
  return (
    <Box dir="rtl" sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={600}>تفاصيل الحجز</Typography>
      <Typography variant="body2" color="text.secondary">سيتم بناء تفاصيل الحجز لاحقًا.</Typography>
    </Box>
  );
}

