"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { enqueueReceiptlessReturn } from '@/lib/outbox';
import { uuid } from '@/lib/pos/idempotency';
import { usePosStore } from '@/lib/store/posStore';
import { ManagerOverrideDialog } from '@/components/policy/ManagerOverrideDialog';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';

export function ReturnSlipModal({ onClose }: { onClose: ()=>void }) {
  const t = useTranslations();
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<'CASH'|'CARD'|'STORE_CREDIT'>('CASH');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [inventoryAction, setInventoryAction] = useState<'NONE'|'PUT_BACK'|'WRITE_OFF'>('NONE');
  const [locationId, setLocationId] = useState<string>('');
  const [reference, setReference] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [confirmAmount, setConfirmAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [policyHint, setPolicyHint] = useState<string>('');
  const [currency, setCurrency] = useState('SAR');
  const [showOverride, setShowOverride] = useState(false);
  const [pendingIdemp, setPendingIdemp] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<any | null>(null);

  const storeCustomerId = usePosStore((s: any) => s.customerId);
  useEffect(() => { if (storeCustomerId) setCustomerId(storeCustomerId || undefined); }, [storeCustomerId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/locales');
        if (res.ok) {
          const s = await res.json();
          setCurrency(s?.currency || 'SAR');
        }
      } catch {}
    })();
  }, []);

  const numericAmount = useMemo(() => {
    const a = Number(String(amount).replace(/[^0-9.]/g, ''));
    return isFinite(a) ? a : 0;
  }, [amount]);

  async function submit() {
    setError(null);
    const amt = numericAmount;
    if (!(amt > 0)) { setError('أدخل مبلغًا صالحًا'); return; }
    if (confirmAmount.trim() !== String(amt)) { setError('يرجى تأكيد المبلغ بكتابته مرة أخرى'); return; }
    setSubmitting(true);
    try {
      const payload = { amount: amt, currency, method, reason: reason || undefined, note: note || undefined, inventory: { action: inventoryAction, locationId: locationId || undefined, reference: reference || undefined }, customerId, attachments: [] as any[] };
      if (navigator.onLine) {
        const idemp = `receiptless:${uuid()}`;
        setPendingPayload(payload); setPendingIdemp(idemp);
        const res = await fetch('/api/returns/receiptless', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemp }, body: JSON.stringify(payload) });
        if (res.status === 403) { setShowOverride(true); return; }
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        // show success elsewhere via Snackbar
        onClose();
        return;
      }
      const localId = uuid();
      await enqueueReceiptlessReturn({ localId, slip: payload });
      onClose();
    } catch (e) {
      setError('فشل إنشاء القسيمة');
    } finally { setSubmitting(false); }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/returns');
        if (res.ok) {
          const s = await res.json();
          setPolicyHint(`سياسة الإرجاع: ${s.windowDays} يومًا`);
        }
      } catch {}
    })();
  }, []);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('receiptless.title') || 'إرجاع بدون فاتورة'}</DialogTitle>
      <DialogContent>
        {policyHint && <Typography variant="caption" color="text.secondary">{policyHint}</Typography>}
        <Grid container spacing={1} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption">{t('receiptless.amount') || 'المبلغ'} ({currency})</Typography>
            <TextField size="small" fullWidth inputProps={{ inputMode: 'decimal', pattern: '[0-9.,]*' }} value={amount} onChange={(e)=> setAmount(e.target.value)} placeholder="0.00" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption">{t('receiptless.method') || 'طريقة الاسترداد'}</Typography>
            <Select size="small" fullWidth value={method} onChange={(e)=> setMethod(e.target.value as any)}>
              <MenuItem value="CASH">نقدًا</MenuItem>
              <MenuItem value="CARD">بطاقة (يدوي)</MenuItem>
              <MenuItem value="STORE_CREDIT">رصيد متجر</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption">{t('receiptless.reason') || 'السبب'}</Typography>
            <TextField size="small" fullWidth value={reason} onChange={(e)=> setReason(e.target.value)} placeholder="اختر/اكتب السبب" />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption">{t('receiptless.note') || 'ملاحظات'}</Typography>
            <TextField size="small" fullWidth multiline minRows={2} value={note} onChange={(e)=> setNote(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption">{t('receiptless.inventory') || 'المخزون'}</Typography>
            <Select size="small" fullWidth value={inventoryAction} onChange={(e)=> setInventoryAction(e.target.value as any)}>
              <MenuItem value="NONE">{t('receiptless.none') || 'بدون تغيير مخزون'}</MenuItem>
              <MenuItem value="PUT_BACK">{t('receiptless.putBack') || 'إرجاع للمخزون'}</MenuItem>
              <MenuItem value="WRITE_OFF">{t('receiptless.writeOff') || 'إتلاف'}</MenuItem>
            </Select>
          </Grid>
          {inventoryAction !== 'NONE' && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption">الموقع/مرجع</Typography>
              <TextField size="small" fullWidth value={locationId} onChange={(e)=> setLocationId(e.target.value)} placeholder="رمز الموقع" />
            </Grid>
          )}
          <Grid item xs={12}>
            <Typography variant="caption">مرجع SKU/وصف (اختياري)</Typography>
            <TextField size="small" fullWidth value={reference} onChange={(e)=> setReference(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption">{t('receiptless.customer') || 'العميل (اختياري)'}</Typography>
            <TextField size="small" fullWidth value={customerId || ''} onChange={(e)=> setCustomerId(e.target.value || undefined)} placeholder="معرّف العميل" />
          </Grid>
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption">{t('receiptless.confirmAmount') || 'للتأكيد، اكتب المبلغ مرة أخرى'}</Typography>
              <TextField size="small" fullWidth inputProps={{ dir: 'ltr' }} value={confirmAmount} onChange={(e)=> setConfirmAmount(e.target.value)} placeholder="0.00" sx={{ mt: 1 }} />
            </Paper>
          </Grid>
        </Grid>
        {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button disabled={submitting} onClick={submit} variant="contained" color="success">تأكيد</Button>
      </DialogActions>

      {showOverride && (
        <ManagerOverrideDialog
          onToken={async (token) => {
            if (!pendingPayload || !pendingIdemp) return;
            try {
              const res = await fetch('/api/returns/receiptless', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': pendingIdemp, 'X-Override-Token': token }, body: JSON.stringify(pendingPayload) });
              if (!res.ok) { const data = await res.json().catch(()=>({})); setError(data?.error?.message || 'مرفوض'); return; }
              onClose();
            } finally {
              setShowOverride(false);
              setPendingPayload(null);
              setPendingIdemp(null);
            }
          }}
          onClose={() => { setShowOverride(false); }}
        />
      )}
    </Dialog>
  );
}
