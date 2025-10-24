"use client";
import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';

export function ManagerOverrideDialog({ onToken, onClose }: { onToken: (t: string) => void; onClose: ()=>void }) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/override', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ managerEmail: email, pinOrPassword: pin }) });
      const data = await res.json();
      if (!res.ok) { setError(data?.error?.message || 'مرفوض'); setLoading(false); return; }
      onToken(data.token);
      onClose();
    } catch {
      setError('فشل الاتصال');
    } finally { setLoading(false); }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>يتطلب هذا الإجراء موافقة المدير.</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <TextField type="email" label="بريد المدير" inputProps={{ dir: 'ltr' }} value={email} onChange={(e)=> setEmail(e.target.value)} required fullWidth />
          <TextField type="password" label="رقم PIN/كلمة المرور" value={pin} onChange={(e)=> setPin(e.target.value)} required fullWidth />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={(e)=> submit(e as any)} disabled={loading} variant="contained">تأكيد</Button>
      </DialogActions>
    </Dialog>
  );
}
