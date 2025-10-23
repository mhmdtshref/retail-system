"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';

type AuditRow = {
  _id: string;
  action: string;
  actor?: { id?: string; role?: string };
  entity?: { type?: string; id?: string };
  status?: string;
  ip?: string;
  ua?: string;
  createdAt?: string;
  ts?: string;
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ action?: string; actorId?: string; entityType?: string; entityId?: string; status?: string }>(
    {}
  );

  useEffect(() => {
    let cancelled = false;
    const url = new URL('/api/admin/audit', window.location.origin);
    if (filters.action) url.searchParams.set('action', filters.action);
    if (filters.actorId) url.searchParams.set('actorId', filters.actorId);
    if (filters.entityType) url.searchParams.set('entityType', filters.entityType);
    if (filters.entityId) url.searchParams.set('entityId', filters.entityId);
    if (filters.status) url.searchParams.set('status', filters.status);
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(url.toString(), { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) setRows(data.items || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filters.action, filters.actorId, filters.entityType, filters.entityId, filters.status]);

  const columns: GridColDef[] = useMemo(() => ([
    { field: 'action', headerName: 'الحدث', width: 160 },
    { field: 'actor', headerName: 'المستخدم', width: 220, valueGetter: (p) => `${p.row.actor?.id || ''} (${p.row.actor?.role || ''})` },
    { field: 'entity', headerName: 'الكيان', width: 240, valueGetter: (p) => `${p.row.entity?.type || ''} ${p.row.entity?.id || ''}` },
    { field: 'ip', headerName: 'عنوان IP', width: 160 },
    { field: 'ua', headerName: 'الوكيل', flex: 1, sortable: false },
    { field: 'status', headerName: 'الحالة', width: 140 },
    { field: 'createdAt', headerName: 'الوقت', width: 220, valueGetter: (p) => p.row.createdAt || p.row.ts, valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleString('ar-SA') : '-') },
  ]), []);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction="row" spacing={1} alignItems="center">
        <Button component={Link as any} href={`/api/admin/audit?format=csv`} variant="contained">تصدير CSV</Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
        <TextField size="small" label="الحدث" value={filters.action || ''} onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })} />
        <TextField size="small" label="المستخدم" value={filters.actorId || ''} onChange={(e) => setFilters({ ...filters, actorId: e.target.value || undefined })} />
        <TextField size="small" label="الكيان" value={filters.entityType || ''} onChange={(e) => setFilters({ ...filters, entityType: e.target.value || undefined })} />
        <TextField size="small" label="المعرف" value={filters.entityId || ''} onChange={(e) => setFilters({ ...filters, entityId: e.target.value || undefined })} />
        <TextField size="small" label="الحالة" value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })} />
      </Stack>

      <DataTable rows={rows} columns={columns} getRowId={(r) => (r as AuditRow)._id} loading={loading} autoHeight />
    </Box>
  );
}
