"use client";
import { Box, Typography } from '@mui/material';

export default function CustomersListPage() {
  return (
    <Box component="main" sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>العملاء</Typography>
      <Typography variant="body2" color="text.secondary">قائمة العملاء مع البحث والفرز ستأتي هنا.</Typography>
    </Box>
  );
}

