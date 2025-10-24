"use client";
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { usePosStore } from '@/lib/store/posStore';
import { posDb } from '@/lib/db/posDexie';
import { Search } from '@/components/pos/Search';
import { Cart } from '@/components/pos/Cart';
import { PayModal } from '@/components/pos/PayModal';
import { Receipt } from '@/components/pos/Receipt';
import { Totals } from '@/components/pos/Totals';
import { CustomerAttachModal } from '@/components/pos/CustomerAttachModal';
import { ReturnSlipModal } from '@/components/returns/ReturnSlipModal';
import { MiniProfileDrawer } from '@/components/pos/MiniProfileDrawer';
import { evaluateLocalForPos } from '@/lib/discounts/local';
import { evaluateTaxForPos } from '@/lib/tax/local';
import { refreshTaxCurrencyConfigs, refreshSettingsConfig } from '@/lib/tax/cache';
import { getCachedSettings } from '@/lib/offline/settings-cache';
import { uuid } from '@/lib/pos/idempotency';
import { getCachedUser } from '@/lib/offline/userRoleCache';
import { MANUAL_DISCOUNT_LIMIT } from '@/lib/policy/policies';
import { LocationSwitcher } from '@/components/pos/LocationSwitcher';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

export default function POSPage() {
  const t = useTranslations();
  const lines = usePosStore((s: any) => s.lines);
  const addLineStore = usePosStore((s: any) => s.addLine);
  const startSale = usePosStore((s: any) => s.startSale);
  const startPartialSale = usePosStore((s: any) => s.startPartialSale);
  const addPayment = usePosStore((s: any) => s.addPayment);
  const setAppliedDiscountsStore = usePosStore((s: any) => s.setAppliedDiscounts);
  const setCouponCodeStore = usePosStore((s: any) => s.setCouponCode);
  const lastReceipt = usePosStore((s: any) => s.lastReceipt);
  const customerIdStore = usePosStore((s: any) => s.customerId);
  const setCustomerIdStore = usePosStore((s: any) => s.setCustomerId);
  const [customerId, setCustomerId] = useState<string | null>(customerIdStore);
  const [availableCredit, setAvailableCredit] = useState<number | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);
  const [offline, setOffline] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showReceiptless, setShowReceiptless] = useState(false);
  const [role, setRole] = useState<string>('viewer');
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Keyboard shortcut: R to open receiptless return modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowReceiptless(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Cache promotions and coupons index from bootstrap
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/pos/bootstrap');
        if (res.ok) {
          const data = await res.json();
          if (data.promotions?.length) await posDb.promotionsActive.bulkPut(data.promotions);
          if (data.couponsIndex?.length) await posDb.couponsIndex.bulkPut(data.couponsIndex);
        }
        // Refresh tax & currency configs for offline
        await refreshTaxCurrencyConfigs();
        await refreshSettingsConfig();
      } catch {}
    })();
  }, []);

  // Cache current user role for offline gating
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self');
        if (res.ok) {
          const data = await res.json();
          const r = data?.user?.role || 'viewer';
          setRole(r);
          try { localStorage.setItem('auth:user', JSON.stringify({ id: data?.user?.id, role: r })); } catch {}
          return;
        }
      } catch {}
      const cached = getCachedUser();
      if (cached?.role) setRole(cached.role);
    })();
  }, []);

  useEffect(() => {
    async function fetchAndCacheCredits() {
      if (!customerId) { setAvailableCredit(null); return; }
      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/customers/${customerId}/credit`);
          if (res.ok) {
            const data = await res.json();
            const credits = (data.credits || []).map((c: any) => ({
              localId: c._id,
              serverId: c._id,
              customerId,
              code: c.code,
              status: c.status,
              issuedAmount: c.issuedAmount,
              remainingAmount: c.remainingAmount,
              expiresAt: c.expiresAt
            }));
            try {
              const existing = await posDb.storeCreditsLocal.where('customerId').equals(customerId).toArray();
              if (existing && existing.length) {
                const ids = existing.map((e: any) => e.localId);
                await posDb.storeCreditsLocal.bulkDelete(ids);
              }
            } catch {}
            if (credits.length) await posDb.storeCreditsLocal.bulkPut(credits);
            const balance = credits.filter((c: any) => c.status === 'active' && (!c.expiresAt || c.expiresAt > Date.now())).reduce((s: number, c: any) => s + (c.remainingAmount || 0), 0);
            setAvailableCredit(balance);
            return;
          }
        } catch {}
      }
      // Fallback to local cache if offline or fetch failed
      try {
        const local = await posDb.storeCreditsLocal.where('customerId').equals(customerId).toArray();
        const balance = local.filter((c: any) => c.status === 'active' && (!c.expiresAt || c.expiresAt > Date.now())).reduce((s: number, c: any) => s + (c.remainingAmount || 0), 0);
        setAvailableCredit(balance);
      } catch {
        setAvailableCredit(null);
      }
    }
    fetchAndCacheCredits();
  }, [customerId]);

  useEffect(() => {
    async function onApplyCredit(e: any) {
      const requested = Number(e.detail?.amount || 0);
      if (!requested || requested <= 0) return;
      if (!customerId) { setSnack({ open: true, message: 'الرجاء اختيار العميل لاستخدام رصيد المتجر', severity: 'warning' }); return; }
      // Read local instruments and split across earliest expiry first
      const list = await posDb.storeCreditsLocal.where('customerId').equals(customerId).toArray();
      let remaining = requested;
      const active = list.filter((c: any) => c.status === 'active' && (!c.expiresAt || c.expiresAt > Date.now())).sort((a: any, b: any) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity));
      for (const c of active) {
        if (remaining <= 0) break;
        const canUse = Math.min(remaining, c.remainingAmount || 0);
        if (canUse <= 0) continue;
        const oid = uuid();
        const idemp = `credit_redeem:${customerId}:${c.code || c.serverId}:${Date.now()}:${oid}`;
        await posDb.outbox.add({ id: oid, type: 'CREDIT_REDEEM', payload: { localId: oid, creditIdOrCode: c.code || c.serverId, customerId, amount: canUse }, idempotencyKey: idemp, createdAt: Date.now(), retryCount: 0 });
        c.remainingAmount = Math.max(0, (c.remainingAmount || 0) - canUse);
        if (c.remainingAmount === 0) c.status = 'redeemed';
        await posDb.storeCreditsLocal.put(c);
        remaining -= canUse;
      }
      const applied = requested - remaining;
      if (applied > 0) {
        await addPayment('store_credit', applied, { customerId });
        setAvailableCredit((v) => (v==null?null:Math.max(0, v - applied)));
        setSnack({ open: true, message: 'تم تطبيق رصيد المتجر', severity: 'success' });
      } else {
        setSnack({ open: true, message: 'لا يوجد رصيد كافٍ للاستخدام', severity: 'warning' });
      }
    }
    window.addEventListener('pos:applyStoreCredit', onApplyCredit as any);
    return () => window.removeEventListener('pos:applyStoreCredit', onApplyCredit as any);
  }, [customerId, addPayment]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const count = await posDb.products.count();
      if (count === 0) {
        try {
          const res = await fetch('/api/pos/bootstrap');
          if (res.ok) {
            const data = await res.json();
            await posDb.products.bulkPut(data.products);
            await posDb.availabilitySnapshot.bulkPut(data.availability);
          }
        } catch {}
      }
      if (!cancelled) setBootstrapped(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const subtotal = useMemo(
    () => (lines as any[]).reduce((sum: number, l: any) => sum + l.qty * l.price, 0),
    [lines]
  );
  const discount = usePosStore((s: any) => s.discount);
  const [taxEval, setTaxEval] = useState<{ subtotalExclTax: number; tax: number; grandTotal: number; roundingAdj?: number; priceMode: 'tax_inclusive'|'tax_exclusive' } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await evaluateTaxForPos(lines as any[], appliedDiscounts as any[]);
      setTaxEval({ subtotalExclTax: res.totals.subtotalExclTax, tax: res.totals.tax, grandTotal: res.totals.grandTotal, roundingAdj: res.totals.roundingAdj, priceMode: res.totals.priceMode });
    })();
  }, [lines, appliedDiscounts]);

  // Evaluate engine locally whenever lines or coupon change
  useEffect(() => {
    (async () => {
      // Enforce manual discount soft limit for cashiers offline as UX gating
      let manual = discount;
      if (role === 'cashier' && manual && manual.type === 'percent' && manual.value > MANUAL_DISCOUNT_LIMIT * 100) {
        manual = { ...manual, value: MANUAL_DISCOUNT_LIMIT * 100 } as any;
      }
      const res = await evaluateLocalForPos(lines as any[], couponCode || null, 'allow_both', manual || null);
      setAppliedDiscounts(res.applied || []);
      setAppliedDiscountsStore(res.applied || []);
    })();
  }, [lines, couponCode, discount, role]);

  const [allowedMethods, setAllowedMethods] = useState<Array<'cash'|'card'|'transfer'|'store_credit'|'cod'|'partial'>>(['cash','card','transfer','store_credit','partial']);
  const [manualLimitPct, setManualLimitPct] = useState<number>(10);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const s = await res.json();
          setAllowedMethods(s?.payments?.enabledMethods || allowedMethods);
          setManualLimitPct(s?.payments?.cashierManualDiscountLimitPct ?? 10);
          return;
        }
      } catch {}
      try {
        const s = await getCachedSettings();
        if (s) {
          setAllowedMethods(s?.payments?.enabledMethods || allowedMethods);
          setManualLimitPct(s?.payments?.cashierManualDiscountLimitPct ?? 10);
        }
      } catch {}
    })();
  }, []);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {offline && (
        <Alert severity="warning" variant="outlined" sx={{ fontSize: 12 }}>
          {t('pos.offline')}
        </Alert>
      )}

      <Stack direction="row" alignItems="center" spacing={1}>
        <LocationSwitcher />
        <Typography fontWeight={600}>{t('pos.cart')}</Typography>
      </Stack>

      <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.paper', backdropFilter: 'blur(6px)', p: 1, borderRadius: 1, border: (t)=> `1px solid ${t.palette.divider}` }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Search onAdd={(line) => addLineStore(line)} />
          <Button variant="outlined" size="small" onClick={()=> setShowCustomerModal(true)}>{t('customers.select') || 'اختر العميل'}</Button>
          <Button variant="outlined" size="small" title="R" onClick={()=> setShowReceiptless(true)}>{t('receiptless.button') || 'إرجاع بدون فاتورة'}</Button>
          {customerId && (
            <Chip color="default" variant="outlined" onClick={()=> setShowMiniProfile(true)} label={`#${customerId.slice(-6)}`} sx={{ cursor: 'pointer' }} />
          )}
          {availableCredit != null && (
            <Chip color="success" variant="outlined" size="small" label={`${t('pos.availableCredit') || 'الرصيد المتاح'}: ${availableCredit?.toFixed(2)}`} />
          )}
        </Stack>
      </Box>

      <Cart />

      <Stack gap={1}>
        <Totals subtotal={subtotal} />
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography fontWeight={600}>{t('pos.coupon') || 'قسيمة'}</Typography>
            <TextField
              value={couponCode}
              onChange={(e)=> { setCouponCode(e.target.value); setCouponCodeStore(e.target.value || null); }}
              size="small"
              placeholder="RAMADAN10"
              inputProps={{ dir: 'ltr' }}
            />
          </Stack>
        </Paper>
        {appliedDiscounts && appliedDiscounts.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>{t('pos.discounts') || 'التخفيضات'}</Typography>
            <Stack gap={0.5}>
              {appliedDiscounts.map((d) => (
                <Stack key={d.traceId} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography component="span">{d.label}</Typography>
                  <Typography color="error">-{Number(d.amount || 0).toFixed(2)}</Typography>
                </Stack>
              ))}
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
              <Typography color="text.secondary">{t('pos.totalSavings') || 'إجمالي التوفير'}</Typography>
              <Typography color="error">-{appliedDiscounts.reduce((s, a)=> s + (a.amount||0), 0).toFixed(2)}</Typography>
            </Stack>
          </Paper>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ position: 'sticky', bottom: 8, mt: 1, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ fontSize: 14 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography color="text.secondary">المجموع قبل الضريبة:</Typography>
            <Typography component="span">{(taxEval?.subtotalExclTax ?? subtotal).toFixed(2)}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography color="text.secondary">{t('pos.discountValue') || 'قيمة الخصم'}:</Typography>
            <Typography color="error">-{appliedDiscounts.reduce((s,a)=> s + (a.amount||0), 0).toFixed(2)}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography color="text.secondary">الضريبة:</Typography>
            <Typography component="span">{(taxEval?.tax ?? 0).toFixed(2)}</Typography>
          </Stack>
          {typeof taxEval?.roundingAdj === 'number' && (taxEval?.roundingAdj || 0) !== 0 && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography color="text.secondary">تعديل التقريب:</Typography>
              <Typography component="span">{taxEval!.roundingAdj! > 0 ? '+' : ''}{taxEval!.roundingAdj!.toFixed(2)}</Typography>
            </Stack>
          )}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ fontWeight: 600 }}>
            <Typography>{t('pos.grandTotal') || 'الإجمالي النهائي'}:</Typography>
            <Typography component="span">{(taxEval?.grandTotal ?? Math.max(0, subtotal - appliedDiscounts.reduce((s,a)=> s + (a.amount||0), 0))).toFixed(2)}</Typography>
          </Stack>
          {taxEval?.priceMode === 'tax_inclusive' && (
            <Typography variant="caption" color="text.secondary">الأسعار تشمل الضريبة</Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" color="success" disabled={lines.length===0} onClick={() => setShowPay(true)}>{t('pos.pay')}</Button>
          <Button variant="outlined" disabled={!lastReceipt} onClick={() => {
            if (!lastReceipt) return;
            const popup = window.open('', '_blank');
            if (!popup) return;
            popup.document.write(`<link rel=\"stylesheet\" href=\"/styles/receipt.css\" />`);
            popup.document.write(document.querySelector('#__receipt_print')?.innerHTML || '');
            popup.document.close();
            popup.focus();
            popup.print();
          }}>{t('pos.receipt')}</Button>
        </Stack>
      </Paper>

      {showPay && (
        <PayModal
          total={(taxEval?.grandTotal ?? subtotal)}
          onClose={() => setShowPay(false)}
          onConfirmCash={async (amount, meta) => { await startSale(); await addPayment('cash', amount, meta); setShowPay(false); }}
          onConfirmCard={async (amount) => { await startSale(); await addPayment('card', amount, {} as any); setShowPay(false); }}
          onConfirmPartial={async (amount, meta) => { await startPartialSale(amount, { schedule: meta.plan?.schedule, minDownPercent: 10, note: meta.reservationNote }); setShowPay(false); }}
        />
      )}

      {showReceiptless && (
        <ReturnSlipModal onClose={()=> setShowReceiptless(false)} />
      )}

      {showCustomerModal && (
        <CustomerAttachModal
          onClose={() => setShowCustomerModal(false)}
          onAttach={(c) => { const id = c._id || null; setCustomerId(id); setCustomerIdStore(id); setShowCustomerModal(false); }}
        />
      )}

      {showMiniProfile && (
        <MiniProfileDrawer customerId={customerId} onClose={() => setShowMiniProfile(false)} />
      )}

      <Box id="__receipt_print" className="hidden print:block">
        {lastReceipt && <Receipt data={lastReceipt} />}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

