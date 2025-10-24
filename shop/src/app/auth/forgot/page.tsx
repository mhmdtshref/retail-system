"use client";
import { useState } from 'react';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <Box component="main" dir="rtl" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Paper component="form" onSubmit={onSubmit} sx={{ width: 420, p: 3 }}>
        <Typography variant="h6" textAlign="center" sx={{ mb: 2 }}>نسيت كلمة المرور</Typography>
        <Stack spacing={2}>
          <TextField type="email" label="البريد الإلكتروني" inputProps={{ dir: 'ltr' }} value={email} onChange={(e)=> setEmail(e.target.value)} required fullWidth />
          {!sent && <Button type="submit" variant="contained" fullWidth>إرسال رابط إعادة التعيين</Button>}
          {sent && <Typography color="success.main" variant="body2" textAlign="center">تم الإرسال إن وجد الحساب.</Typography>}
        </Stack>
      </Paper>
    </Box>
  );
}
