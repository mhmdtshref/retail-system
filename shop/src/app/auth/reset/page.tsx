"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return;
    setOk(true);
  }

  return (
    <Box component="main" dir="rtl" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Paper component="form" onSubmit={onSubmit} sx={{ width: 420, p: 3 }}>
        <Typography variant="h6" textAlign="center" sx={{ mb: 2 }}>إعادة تعيين كلمة المرور</Typography>
        <Stack spacing={2}>
          <TextField type="password" label="كلمة المرور الجديدة" value={password} onChange={(e)=> setPassword(e.target.value)} required fullWidth />
          <TextField type="password" label="تأكيد كلمة المرور" value={confirm} onChange={(e)=> setConfirm(e.target.value)} required fullWidth />
          <Button type="submit" variant="contained" fullWidth>تعيين</Button>
          {ok && <Typography color="success.main" variant="body2" textAlign="center">تم التعيين</Typography>}
          <Typography textAlign="center" variant="body2">
            <Button onClick={() => router.push('/sign-in')} variant="text">العودة لتسجيل الدخول</Button>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
