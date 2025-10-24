import { notFound } from 'next/navigation';
import { Box, Grid, Paper, Stack, Typography } from '@mui/material';

async function getData(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/customers/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.customer;
  } catch { return null; }
}

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();
  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6" fontWeight={600}>{data.fullName_ar || data.fullName_en}</Typography>
          <Typography variant="caption" color="text.secondary">{(data.phones || []).map((p: any) => p.e164).join(' • ')}</Typography>
        </Box>
        <Paper variant="outlined" sx={{ px: 1, py: 0.5 }}>
          <Typography variant="caption">{data.status === 'active' ? 'نشط' : 'مؤرشف'}</Typography>
        </Paper>
      </Stack>
      <Grid container spacing={1}>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">إجمالي المشتريات</Typography>
            <Typography fontWeight={600}>{(data.stats?.lifetimeSpend || 0).toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">عدد الطلبات</Typography>
            <Typography fontWeight={600}>{data.stats?.ordersCount || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">آخر طلب</Typography>
            <Typography fontWeight={600}>{data.stats?.lastOrderAt ? new Date(data.stats.lastOrderAt).toLocaleDateString() : '—'}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">رصيد المتجر</Typography>
            <Typography fontWeight={600}>{(data.stats?.storeCredit || 0).toFixed(2)}</Typography>
          </Paper>
        </Grid>
      </Grid>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600} sx={{ mb: 1 }}>العناوين</Typography>
        <Typography variant="body2" color="text.secondary">إدارة العناوين ستضاف لاحقًا.</Typography>
      </Paper>
    </Box>
  );
}

