"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';

export default function NewPOPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<Array<{ sku?: string; size?: string; color?: string; unitCost?: number; quantityOrdered?: number }>>([
    {}
  ]);

  useEffect(() => {
    // For now there is no suppliers endpoint; allow free text id or seed later
    setSuppliers([{ _id: 'SUP-1', name: 'المورد التجريبي' }]);
    setSupplierId('SUP-1');
  }, []);

  async function create() {
    const res = await fetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplierId, lines }) });
    const data = await res.json();
    if (res.ok) {
      router.push(`/purchase-orders/${data._id}`);
    }
  }

  return (
    <Box sx={{ p: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>إنشاء أمر شراء</Typography>
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Typography variant="caption">المورد</Typography>
        <Select size="small" value={supplierId} onChange={(e) => setSupplierId(e.target.value as string)} sx={{ maxWidth: 360 }}>
          {suppliers.map((s) => (
            <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
          ))}
        </Select>
      </Stack>
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="right">الكود/الرمز</TableCell>
              <TableCell align="right">المقاس</TableCell>
              <TableCell align="right">اللون</TableCell>
              <TableCell align="right">الكمية</TableCell>
              <TableCell align="right">سعر الوحدة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((l, idx) => (
              <TableRow key={idx}>
                <TableCell align="right"><TextField size="small" value={l.sku || ''} onChange={(e)=>{ const next=[...lines]; next[idx].sku=e.target.value; setLines(next); }} sx={{ width: 200 }} /></TableCell>
                <TableCell align="right"><TextField size="small" value={l.size || ''} onChange={(e)=>{ const next=[...lines]; next[idx].size=e.target.value; setLines(next); }} sx={{ width: 140 }} /></TableCell>
                <TableCell align="right"><TextField size="small" value={l.color || ''} onChange={(e)=>{ const next=[...lines]; next[idx].color=e.target.value; setLines(next); }} sx={{ width: 140 }} /></TableCell>
                <TableCell align="right"><TextField size="small" type="number" value={l.quantityOrdered || 0} onChange={(e)=>{ const next=[...lines]; next[idx].quantityOrdered=Number(e.target.value); setLines(next); }} sx={{ width: 120 }} /></TableCell>
                <TableCell align="right"><TextField size="small" type="number" value={l.unitCost || 0} onChange={(e)=>{ const next=[...lines]; next[idx].unitCost=Number(e.target.value); setLines(next); }} sx={{ width: 120 }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={()=>setLines([...lines, {}])}>إضافة بند</Button>
        <Button variant="contained" color="success" onClick={create}>حفظ ومتابعة</Button>
      </Stack>
    </Box>
  );
}

