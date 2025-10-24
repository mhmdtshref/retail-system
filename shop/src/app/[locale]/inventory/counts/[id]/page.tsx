"use client";
import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { posDb } from '@/lib/db/posDexie';
import { queueSyncCountSession, addLocalCountItem, upsertLocalCountSession, queuePostVariances } from '@/lib/offline/count-sync';
import { attachScanner, loadScannerConfig } from '@/lib/scanner/hid';
import { Box, Stack, Typography, TextField, Button, Snackbar, Alert, Checkbox } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef, GridRowModel } from '@mui/x-data-grid';

type CountItem = { sku: string; onHandAtStart: number; counted?: number; variance?: number; recount?: boolean; note?: string };
type Session = { _id: string; name: string; status: 'open'|'reviewing'|'posted'; items: CountItem[]; createdAt: string };

export default function CountSessionPage({ params }: { params: { id: string } }) {
  const locale = useLocale();
  const id = (params as any).id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [offline, setOffline] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });
  const isLocal = id.startsWith('local-');

  async function load() {
    setLoading(true);
    if (isLocal) {
      const localId = id.replace('local-','');
      const s = await posDb.countSessions.get({ localId } as any);
      const items = await posDb.countItems.where('localSessionId').equals(localId).toArray();
      const sess: Session = { _id: id, name: s?.name || 'محلي', status: s?.status || 'open', items: items.map((i: any) => ({ sku: i.sku, onHandAtStart: i.onHandAtStart || 0, counted: i.counted, variance: i.variance, recount: i.recount, note: i.note })), createdAt: new Date(s?.createdAt || Date.now()).toISOString() };
      setSession(sess);
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/inventory/count-sessions/${id}`);
    const data = await res.json();
    setSession(data.session);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    const detach = attachScanner({
      beep: true,
      onScan: async (code) => {
        const lc = code.trim().toLowerCase();
        const existing = (session?.items || []).find((i) => i.sku.toLowerCase() === lc);
        const nextCount = (existing?.counted || 0) + 1;
        await saveItems([{ sku: existing?.sku || code, counted: nextCount }]);
      },
    }, loadScannerConfig());
    return () => { detach(); };
  }, [session]);

  const filtered = useMemo(() => {
    if (!session) return [] as CountItem[];
    const q = search.trim().toLowerCase();
    if (!q) return session.items || [];
    return (session.items || []).filter((i) => i.sku.toLowerCase().includes(q));
  }, [session, search]);

  async function saveItems(patch: Array<Partial<CountItem> & { sku: string }>, status?: 'open'|'reviewing') {
    setSaving(true);
    try {
      if (isLocal) {
        const localId = id.replace('local-','');
        for (const p of patch) {
          const existing = await posDb.countItems.where('localSessionId').equals(localId).and((i: any) => i.sku === p.sku).first();
          if (existing) {
            const next = { ...existing, counted: typeof p.counted === 'number' ? p.counted : existing.counted, recount: typeof p.recount === 'boolean' ? p.recount : existing.recount, note: typeof p.note === 'string' ? p.note : existing.note } as any;
            next.variance = (next.counted ?? 0) - (next.onHandAtStart || 0);
            await posDb.countItems.update(existing.id, next);
          } else {
            await addLocalCountItem(localId, { sku: p.sku, onHandAtStart: 0, counted: p.counted, variance: (p.counted || 0) - 0, recount: p.recount, note: p.note });
          }
        }
        if (status) {
          const sess = await posDb.countSessions.where('localId').equals(localId).first();
          if (sess) { await posDb.countSessions.update(sess.id || (sess as any).localId, { status }); }
        }
        await load();
      } else {
        const res = await fetch(`/api/inventory/count-sessions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${Date.now()}-${Math.random()}` }, body: JSON.stringify({ items: patch, status }) });
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
        }
      }
    } finally { setSaving(false); }
  }

  async function postVariances() {
    setPosting(true);
    try {
      if (isLocal) {
        if (!navigator.onLine) return;
        const localId = id.replace('local-','');
        const map = await posDb.syncLog.get({ key: `count:${localId}` } as any);
        if (!map) return;
        const serverId = map.value as string;
        await queuePostVariances(serverId, `${Date.now()}-${Math.random()}`);
        return;
      }
      const res = await fetch(`/api/inventory/count-sessions/${id}/post`, { method: 'POST', headers: { 'Idempotency-Key': `${Date.now()}-${Math.random()}` } });
      if (res.ok) await load();
    } finally { setPosting(false); }
  }

  if (loading || !session) return <Box component="main" sx={{ p: 2 }} dir="rtl">جارٍ التحميل...</Box>;

  const statusLabel = session.status === 'open' ? 'مفتوح' : session.status === 'reviewing' ? 'قيد المراجعة' : 'تم الترحيل';
  const showReview = session.status !== 'posted';

  const columns: GridColDef[] = [
    { field: 'sku', headerName: 'SKU', width: 200, renderCell: (p) => <bdi dir="ltr">{String(p.value || '')}</bdi> },
    { field: 'onHandAtStart', headerName: 'على المخزون', width: 160, valueFormatter: (p) => new Intl.NumberFormat(locale).format(Number(p.value || 0)) },
    { field: 'counted', headerName: 'العد', width: 140, editable: session.status === 'open', type: 'number' },
    { field: 'variance', headerName: 'الفارق', width: 140, valueFormatter: (p) => new Intl.NumberFormat(locale).format(Number(p.value || 0)), cellClassName: (p) => (Number(p.value || 0) > 0 ? 'text-green-700' : Number(p.value || 0) < 0 ? 'text-red-700' : 'text-gray-500') },
    { field: 'recount', headerName: 'إعادة الجرد', width: 140, renderCell: (p) => (
      session.status !== 'posted' ? <Checkbox checked={!!p.row.recount} onChange={(e) => saveItems([{ sku: (p.row as any).sku, recount: e.target.checked }])} /> : (p.row.recount ? '✔' : '')
    ) },
    { field: 'note', headerName: 'ملاحظة', flex: 1, minWidth: 200, editable: session.status !== 'posted' },
  ];

  function processRowUpdate(newRow: GridRowModel, oldRow: GridRowModel) {
    if (!session) return newRow;
    const sku = String(newRow.sku || oldRow.sku);
    const counted = newRow.counted === '' || newRow.counted === null || newRow.counted === undefined ? undefined : Number(newRow.counted);
    const note = typeof newRow.note === 'string' ? newRow.note : undefined;
    saveItems([{ sku, counted, note }]);
    return newRow;
  }

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6" fontWeight={600}>{session.name}</Typography>
          <Typography variant="body2" color="text.secondary">الحالة: {statusLabel}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {session.status === 'open' && <Button disabled={saving} onClick={() => saveItems([], 'reviewing')} variant="outlined">الانتقال للمراجعة</Button>}
          {session.status === 'reviewing' && <Button disabled={posting || (isLocal && (!navigator.onLine))} onClick={postVariances} variant="contained" color="primary">ترحيل الفروقات</Button>}
        </Stack>
      </Stack>

      {showReview && (
        <Box sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', p: 2, zIndex: 10 }}>
          <TextField size="small" fullWidth value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث/مسح SKU" inputProps={{ dir: 'ltr' }} />
          {isLocal && !navigator.onLine && (
            <Alert severity="warning" sx={{ mt: 1 }}>أنت غير متصل. سيتم حفظ العد محليًا وسيتم المزامنة لاحقًا. يتطلب ترحيل الفروقات اتصالاً بالإنترنت.</Alert>
          )}
        </Box>
      )}

      <DataTable
        rows={filtered.map((it, i) => ({ id: it.sku, ...it }))}
        columns={columns}
        loading={loading}
        autoHeight
        editMode="row"
        processRowUpdate={processRowUpdate}
        getRowId={(r) => (r as any).id}
      />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


