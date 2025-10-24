"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePosStore } from '@/lib/store/posStore';
import { evaluateTaxForPos } from '@/lib/tax/local';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
  Typography,
  Stack,
} from '@mui/material';

type Props = {
  total: number;
  onConfirmCash: (amount: number, meta?: { receivedCash?: number }) => void;
  onConfirmCard: (amount: number) => void;
  onConfirmPartial: (downPayment: number, meta: { reservationNote?: string; plan?: { count: number; intervalDays: number; schedule: Array<{ seq: number; dueDate: string; amount: number }> } }) => void;
  onClose: () => void;
};

export function PayModal({ total, onConfirmCash, onConfirmCard, onConfirmPartial, onClose }: Props) {
  const t = useTranslations();
  const [tab, setTab] = useState<'cash'|'card'|'partial'|'store_credit'>('cash');
  const [cash, setCash] = useState(total);
  const [cardAmount, setCardAmount] = useState(total);
  const [partial, setPartial] = useState(Math.max(1, Math.round(total * 0.1)));
  const [note, setNote] = useState('');
  const [installments, setInstallments] = useState(2);
  const [intervalDays, setIntervalDays] = useState(14);
  const [schedule, setSchedule] = useState<Array<{ seq: number; dueDate: string; amount: number }>>([]);
  const [storeCreditAmount, setStoreCreditAmount] = useState(0);
  const [availableCredit, setAvailableCredit] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const minPartial = Math.ceil(total * 0.1);

  const lines = usePosStore((s: any) => s.lines);
  const appliedDiscounts = usePosStore((s: any) => s.appliedDiscounts);
  const [cashRoundedTotal, setCashRoundedTotal] = useState<number>(total);
  const [cashRoundingAdj, setCashRoundingAdj] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await evaluateTaxForPos(lines as any[], appliedDiscounts as any[], { paymentMethod: 'cash' });
        setCashRoundedTotal(res.totals.grandTotal);
        setCashRoundingAdj(res.totals.roundingAdj || 0);
        setCash(res.totals.grandTotal);
      } catch {}
    })();
  }, [lines, appliedDiscounts]);

  const validCash = cash >= total && cash > 0;
  const validCard = cardAmount > 0;
  const validPartial = partial >= minPartial && partial < total;
  const validStoreCredit = storeCreditAmount > 0 && storeCreditAmount <= (availableCredit ?? 0) && storeCreditAmount <= total;

  const generateSchedule = () => {
    const remaining = Math.max(0, total - partial);
    const n = Math.max(1, installments);
    const base = Math.floor((remaining / n) * 100) / 100;
    const out: Array<{ seq: number; dueDate: string; amount: number }> = [];
    const today = new Date();
    let acc = 0;
    for (let i = 1; i <= n; i++) {
      const due = new Date(today.getTime() + i * intervalDays * 24 * 60 * 60 * 1000);
      const amt = i === n ? Math.round((remaining - acc) * 100) / 100 : base;
      acc += amt;
      out.push({ seq: i, dueDate: due.toISOString(), amount: amt });
    }
    setSchedule(out);
  };

  const [allowed, setAllowed] = useState<Array<'cash'|'card'|'transfer'|'store_credit'|'cod'|'partial'>>(['cash','card','transfer','store_credit','partial']);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const s = await res.json();
          setAllowed(s?.payments?.enabledMethods || allowed);
        }
      } catch {}
    })();
  }, []);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('pos.pay') || 'الدفع'}</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          {allowed.includes('cash') && <Tab value="cash" label={t('pos.cash') || 'نقدًا'} />}
          {allowed.includes('card') && <Tab value="card" label={t('pos.card') || 'بطاقة'} />}
          {allowed.includes('partial') && <Tab value="partial" label={t('pos.partial') || 'تقسيط'} />}
          {allowed.includes('store_credit') && <Tab value="store_credit" label={t('pos.storeCredit') || 'رصيد المتجر'} />}
        </Tabs>

        {tab === 'cash' && (
          <Box sx={{ mt: 2 }}>
            <Typography fontSize={14}>{t('pos.total')}: {cashRoundedTotal.toFixed(2)}</Typography>
            {typeof cashRoundingAdj === 'number' && cashRoundingAdj !== 0 && (
              <Typography variant="caption" color="text.secondary">تعديل التقريب: {cashRoundingAdj > 0 ? '+' : ''}{cashRoundingAdj.toFixed(2)}</Typography>
            )}
            <TextField type="number" value={cash} onChange={(e)=> setCash(Number(e.target.value))} inputProps={{ dir: 'ltr' }} fullWidth size="small" sx={{ mt: 1.5 }} />
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button disabled={!validCash} variant="contained" color="success" onClick={()=> onConfirmCash(cash, { receivedCash: cash })}>
                {t('common.confirm') || 'تأكيد'}
              </Button>
            </Stack>
          </Box>
        )}

        {tab === 'card' && (
          <Box sx={{ mt: 2 }}>
            <TextField type="number" value={cardAmount} onChange={(e)=> setCardAmount(Number(e.target.value))} inputProps={{ dir: 'ltr' }} fullWidth size="small" placeholder={t('pos.amount') || 'المبلغ'} />
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button disabled={!validCard} variant="contained" color="success" onClick={()=> onConfirmCard(cardAmount)}>
                {t('common.confirm') || 'تأكيد'}
              </Button>
            </Stack>
          </Box>
        )}

        {tab === 'partial' && (
          <Box sx={{ mt: 2 }}>
            <Typography fontSize={14}>{t('pos.minDownPayment') || 'الدفعة الأدنى'}: {minPartial.toFixed(2)}</Typography>
            <TextField type="number" value={partial} onChange={(e)=> setPartial(Number(e.target.value))} inputProps={{ dir: 'ltr' }} fullWidth size="small" placeholder={t('pos.downPayment') || 'الدفعة المقدمة'} sx={{ mt: 1 }} />
            <TextField value={note} onChange={(e)=> setNote(e.target.value)} fullWidth size="small" placeholder={t('pos.reservationNote') || 'ملاحظة الحجز'} sx={{ mt: 1 }} />
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>{t('pos.installmentsCount') || 'عدد الأقساط'}</Typography>
                <TextField type="number" inputProps={{ min: 1, dir: 'ltr' }} value={installments} onChange={(e)=> setInstallments(Number(e.target.value))} size="small" fullWidth />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>{t('pos.intervalDays') || 'فاصل الأيام'}</Typography>
                <TextField type="number" inputProps={{ min: 1, dir: 'ltr' }} value={intervalDays} onChange={(e)=> setIntervalDays(Number(e.target.value))} size="small" fullWidth />
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
              <Button variant="outlined" onClick={generateSchedule}>{t('pos.generatePlan') || 'توليد خطة'}</Button>
              <Typography color="text.secondary" fontSize={14}>
                {(schedule && schedule.length>0) ? `${t('pos.installments') || 'أقساط'}: ${schedule.length}` : t('pos.noPlan') || 'بدون خطة'}
              </Typography>
            </Stack>
            {schedule && schedule.length > 0 && (
              <Box sx={{ maxHeight: 180, overflow: 'auto', border: (t)=> `1px solid ${t.palette.divider}`, borderRadius: 1, p: 1, mt: 1 }}>
                {schedule.map((s) => (
                  <Stack key={s.seq} direction="row" justifyContent="space-between" sx={{ fontSize: 12 }}>
                    <Typography component="span">#{s.seq}</Typography>
                    <Typography component="span" dir="ltr">{new Date(s.dueDate).toLocaleDateString()}</Typography>
                    <Typography component="span">{s.amount.toFixed(2)}</Typography>
                  </Stack>
                ))}
              </Box>
            )}
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button disabled={!validPartial} variant="contained" color="success" onClick={()=> onConfirmPartial(partial, { reservationNote: note, plan: schedule.length>0 ? { count: installments, intervalDays, schedule } : undefined })}>
                {t('common.confirm') || 'تأكيد'}
              </Button>
            </Stack>
          </Box>
        )}

        {tab === 'store_credit' && (
          <Box sx={{ mt: 2 }}>
            <Typography fontSize={14}>{t('pos.availableCredit') || 'الرصيد المتاح'}: {availableCredit == null ? '—' : availableCredit.toFixed(2)}</Typography>
            <TextField type="number" value={storeCreditAmount} onChange={(e)=> setStoreCreditAmount(Number(e.target.value))} inputProps={{ dir: 'ltr' }} fullWidth size="small" placeholder={t('pos.amount') || 'المبلغ'} sx={{ mt: 1 }} />
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button disabled={!validStoreCredit} variant="contained" color="success" onClick={()=> {
                const ev = new CustomEvent('pos:applyStoreCredit', { detail: { amount: storeCreditAmount } });
                window.dispatchEvent(ev);
                onClose();
              }}>
                {t('common.apply') || 'تطبيق'}
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close') || 'إغلاق'}</Button>
      </DialogActions>
    </Dialog>
  );
}

