"use client";
import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { upsertLocalCountSession, queueSyncCountSession } from '@/lib/offline/count-sync';
import { Box, Button, Paper, Snackbar, Stack, TextField, Typography, Alert } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';

type SessionLite = { _id: string; name: string; status: 'open'|'reviewing'|'posted'; createdAt: string };

export default function CountsPage() {
  const locale = useLocale();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'all'|'filter'|'upload'>('all');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [creating, setCreating] = useState(false);
  const [offline, setOffline] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/inventory/count-sessions');
    const data = await res.json();
    setSessions((data.sessions || []).map((s: any) => ({ _id: s._id, name: s.name, status: s.status, createdAt: s.createdAt })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
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

  async function createSession() {
    setCreating(true);
    try {
      const body: any = { name, scope: { type: scope } };
      if (scope === 'filter') body.scope.filter = { category: category || undefined, brand: brand || undefined };
      const idempotencyKey = `${Date.now()}-${Math.random()}`;
      if (offline) {
        const localId = await upsertLocalCountSession({ name, scope: body.scope });
        await queueSyncCountSession(localId, idempotencyKey);
        router.push(`/${locale}/inventory/counts/local-${localId}`);
        return;
      }
      const res = await fetch('/api/inventory/count-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        router.push(`/${locale}/inventory/counts/${data.session._id}`);
      } else {
        // fallback to offline local
        const localId = await upsertLocalCountSession({ name, scope: body.scope });
        await queueSyncCountSession(localId, idempotencyKey);
        router.push(`/${locale}/inventory/counts/local-${localId}`);
      }
    } finally { setCreating(false); }
  }

  const columns: GridColDef[] = useMemo(() => ([
    { field: 'name', headerName: 'الاسم', flex: 1 },
    { field: 'status', headerName: 'الحالة', width: 160, valueFormatter: (p) => (p.value === 'open' ? 'مفتوح' : p.value === 'reviewing' ? 'قيد المراجعة' : 'تم الترحيل') },
    { field: 'createdAt', headerName: 'تاريخ الإنشاء', width: 220, valueFormatter: (p) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(p.value as string)) },
    { field: 'actions', headerName: 'إجراءات', width: 120, sortable: false, renderCell: (p) => (
      <Button size="small" component="a" href={`/${locale}/inventory/counts/${(p.row as SessionLite)._id}`}>فتح</Button>
    ) },
  ]), [locale]);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight={600}>الجرد الدوري</Typography>
        <Button component="a" href={`/${locale}/inventory/adjustments`} variant="text">التسويات</Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography fontWeight={600}>بدء جلسة جرد</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField size="small" placeholder="اسم الجلسة" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField select size="small" value={scope} onChange={(e) => setScope(e.target.value as any)} sx={{ width: 200 }}>
            <option value="all">كل الأصناف</option>
            <option value="filter">تصفية</option>
            <option value="upload">رفع ملف</option>
          </TextField>
          {scope === 'filter' && (
            <>
              <TextField size="small" placeholder="التصنيف" value={category} onChange={(e) => setCategory(e.target.value)} />
              <TextField size="small" placeholder="العلامة" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </>
          )}
          <Button disabled={creating || !name} onClick={createSession} variant="contained">إنشاء</Button>
        </Stack>
      </Paper>

      {offline && <Alert severity="warning">أنت غير متصل. سيتم إنشاء جلسة محليًا والمزامنة لاحقًا.</Alert>}
      {loading ? <Typography>جارٍ التحميل...</Typography> : (
        <DataTable rows={sessions} columns={columns} getRowId={(r) => (r as SessionLite)._id} autoHeight />
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}


