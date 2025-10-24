"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

export const metadata = {
  title: 'تتبع الطلب',
  description: 'تحقق من حالة طلبك وشحناتك.',
  robots: { index: false, follow: false },
  openGraph: { title: 'تتبع الطلب', description: 'تحقق من حالة طلبك وشحناتك.' }
} as const;

export default function TrackLookupPage() {
  const [orderCode, setOrderCode] = useState('');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingOtp, setPendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | undefined>(undefined);
  const router = useRouter();

  async function submitLookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/public/track/lookup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderCode, emailOrPhone: contact }) });
    const data = await res.json();
    if (!res.ok) { setError(data?.error || 'خطأ'); return; }
    if (data.pendingOtp) { setPendingOtp(true); setDebugOtp(data.debugOtp); }
  }

  async function submitOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/public/track/verify-otp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderCode, otp }) });
    const data = await res.json();
    if (!res.ok) { setError(data?.error || 'خطأ'); return; }
    router.push(`/track/${data.orderId}?t=${encodeURIComponent(data.trackToken)}`);
  }

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', p: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>تتبع الطلب</Typography>
      {!pendingOtp ? (
        <Paper component="form" onSubmit={submitLookup} sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField label="رقم الطلب" value={orderCode} onChange={(e)=>setOrderCode(e.target.value)} inputProps={{ dir: 'ltr' }} placeholder="مثال: 123456" required />
            <TextField label="البريد الإلكتروني أو الهاتف" value={contact} onChange={(e)=>setContact(e.target.value)} inputProps={{ dir: 'ltr' }} placeholder="example@email.com أو 05xxxxxxxx" required />
            {error && <Typography color="error" variant="body2">{String(error)}</Typography>}
            <Button type="submit" variant="contained">تحقق</Button>
          </Stack>
        </Paper>
      ) : (
        <Paper component="form" onSubmit={submitOtp} sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">تم إرسال رمز تحقق لمرة واحدة. أدخل الرمز للمتابعة.</Typography>
            {debugOtp && <Typography variant="caption" color="text.secondary">رمز تجريبي: {debugOtp}</Typography>}
            <TextField label="رمز التحقق" value={otp} onChange={(e)=>setOtp(e.target.value)} inputProps={{ dir: 'ltr' }} placeholder="123456" required />
            {error && <Typography color="error" variant="body2">{String(error)}</Typography>}
            <Button type="submit" variant="contained">عرض التتبع</Button>
          </Stack>
        </Paper>
      )}
      <Typography sx={{ mt: 3 }} variant="caption" color="text.secondary">لن يتم فهرسة هذه الصفحة من محركات البحث.</Typography>
    </Box>
  );
}

