"use client";
import { useState } from 'react';
import { normalizeToE164 } from '@/lib/phone';
import { posDb } from '@/lib/db/posDexie';
import { enqueueCustomerCreate } from '@/lib/outbox';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';

type Props = { onCreated: (c: any) => void };

export function QuickCreate({ onCreated }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const full = name.trim();
    if (!full) { setError('الاسم مطلوب'); return; }
    const { e164, digits } = normalizeToE164(phone || '', { defaultCountry: 'SA' });
    const payload: any = { fullName_ar: full, phones: e164 ? [{ e164, raw: phone, primary: true }] : [] };
    try {
      setPending(true);
      if (!navigator.onLine) {
        try { await posDb.customerDrafts.put({ localId: crypto.randomUUID(), payload, createdAt: Date.now() }); } catch {}
        await enqueueCustomerCreate(payload);
        onCreated({ _id: undefined, fullName_ar: full, phones: payload.phones, offlinePending: true });
        setPending(false);
        return;
      }
      const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `customer:${Date.now()}:${Math.random()}` }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      onCreated(data.customer);
    } catch (e: any) {
      setError(e?.message || 'فشل الإنشاء');
    } finally {
      setPending(false);
    }
  }

  return (
    <Box>
      <Typography variant="caption">إنشاء سريع</Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        <TextField size="small" placeholder="الاسم الكامل" value={name} onChange={(e)=> setName(e.target.value)} fullWidth />
        <TextField size="small" placeholder="رقم الجوال" inputProps={{ dir: 'ltr' }} value={phone} onChange={(e)=> setPhone(e.target.value)} fullWidth />
        {error && <Typography color="error" variant="caption">{error}</Typography>}
        <Button disabled={pending} onClick={submit} variant="contained" color="success">حفظ</Button>
      </Stack>
    </Box>
  );
}

