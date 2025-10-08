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
import { MiniProfileDrawer } from '@/components/pos/MiniProfileDrawer';
import { evaluateLocalForPos } from '@/lib/discounts/local';
import { evaluateTaxForPos } from '@/lib/tax/local';
import { refreshTaxCurrencyConfigs, refreshSettingsConfig } from '@/lib/tax/cache';
import { getCachedSettings } from '@/lib/offline/settings-cache';
import { uuid } from '@/lib/pos/idempotency';
import { getCachedUser } from '@/lib/offline/userRoleCache';
import { MANUAL_DISCOUNT_LIMIT } from '@/lib/policy/policies';

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
  const [role, setRole] = useState<string>('viewer');

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
      if (!customerId) { alert('الرجاء اختيار العميل لاستخدام رصيد المتجر'); return; }
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
      } else {
        alert('لا يوجد رصيد كافٍ للاستخدام');
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
    <main className="p-4 flex flex-col gap-3">
      {offline && (
        <div className="rounded bg-yellow-100 text-yellow-900 p-2 text-sm">
          {t('pos.offline')}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="font-medium">{t('pos.cart')}</span>
      </div>

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur p-1 rounded">
        <div className="flex items-center gap-2">
          <Search onAdd={(line) => addLineStore(line)} />
          <button className="px-2 py-1 rounded border" onClick={()=> setShowCustomerModal(true)}>{t('customers.select') || 'اختر العميل'}</button>
          {customerId && (
            <button className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800" onClick={()=> setShowMiniProfile(true)}>
              #{customerId.slice(-6)}
            </button>
          )}
          {availableCredit != null && (
            <span className="text-xs rounded bg-emerald-50 text-emerald-700 px-2 py-1">{t('pos.availableCredit') || 'الرصيد المتاح'}: {availableCredit?.toFixed(2)}</span>
          )}
        </div>
      </div>

      <Cart />

      <div className="grid gap-2">
        <Totals subtotal={subtotal} />
        <div className="rounded border p-3 flex items-center gap-2">
          <span className="font-medium">{t('pos.coupon') || 'قسيمة'}</span>
          <input value={couponCode} onChange={(e)=> { setCouponCode(e.target.value); setCouponCodeStore(e.target.value || null); }} className="border rounded px-2 py-1" dir="ltr" placeholder="RAMADAN10" />
        </div>
        {appliedDiscounts && appliedDiscounts.length > 0 && (
          <div className="rounded border p-3 text-sm">
            <div className="font-medium mb-1">{t('pos.discounts') || 'التخفيضات'}</div>
            <div className="space-y-1">
              {appliedDiscounts.map((d) => (
                <div key={d.traceId} className="flex items-center justify-between">
                  <div>{d.label}</div>
                  <div className="text-rose-600">-{Number(d.amount || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="text-muted-foreground">{t('pos.totalSavings') || 'إجمالي التوفير'}</div>
              <div className="text-rose-600">-{appliedDiscounts.reduce((s, a)=> s + (a.amount||0), 0).toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-2 mt-2 bg-white dark:bg-black border rounded p-3 flex items-center justify-between">
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">المجموع قبل الضريبة:</span>
            <span>{(taxEval?.subtotalExclTax ?? subtotal).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('pos.discountValue') || 'قيمة الخصم'}:</span>
            <span className="text-rose-600">-{appliedDiscounts.reduce((s,a)=> s + (a.amount||0), 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">الضريبة:</span>
            <span>{(taxEval?.tax ?? 0).toFixed(2)}</span>
          </div>
          {typeof taxEval?.roundingAdj === 'number' && (taxEval?.roundingAdj || 0) !== 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">تعديل التقريب:</span>
              <span>{taxEval!.roundingAdj! > 0 ? '+' : ''}{taxEval!.roundingAdj!.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 font-semibold">
            <span>{t('pos.grandTotal') || 'الإجمالي النهائي'}:</span>
            <span>{(taxEval?.grandTotal ?? Math.max(0, subtotal - appliedDiscounts.reduce((s,a)=> s + (a.amount||0), 0))).toFixed(2)}</span>
          </div>
          {taxEval?.priceMode === 'tax_inclusive' && (
            <div className="text-[11px] text-neutral-600">الأسعار تشمل الضريبة</div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50" disabled={lines.length===0} onClick={() => setShowPay(true)}>{t('pos.pay')}</button>
          <button className="px-3 py-2 rounded border disabled:opacity-50" disabled={!lastReceipt} onClick={() => {
            if (!lastReceipt) return;
            const popup = window.open('', '_blank');
            if (!popup) return;
            popup.document.write(`<link rel=\"stylesheet\" href=\"/styles/receipt.css\" />`);
            popup.document.write(document.querySelector('#__receipt_print')?.innerHTML || '');
            popup.document.close();
            popup.focus();
            popup.print();
          }}>{t('pos.receipt')}</button>
        </div>
      </div>

      {showPay && (
        <PayModal
          total={(taxEval?.grandTotal ?? subtotal)}
          onClose={() => setShowPay(false)}
          onConfirmCash={async (amount, meta) => { await startSale(); await addPayment('cash', amount, meta); setShowPay(false); }}
          onConfirmCard={async (amount) => { await startSale(); await addPayment('card', amount, {} as any); setShowPay(false); }}
          onConfirmPartial={async (amount, meta) => { await startPartialSale(amount, { schedule: meta.plan?.schedule, minDownPercent: 10, note: meta.reservationNote }); setShowPay(false); }}
        />
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

      <div id="__receipt_print" className="hidden print:block">
        {lastReceipt && <Receipt data={lastReceipt} />}
      </div>
    </main>
  );
}

