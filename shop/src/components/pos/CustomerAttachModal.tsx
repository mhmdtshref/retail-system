"use client";
import { useEffect, useState } from 'react';
import { CustomerSearch } from '@/components/customers/CustomerSearch';
import { QuickCreate } from '@/components/customers/QuickCreate';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tab, Tabs } from '@mui/material';

type Props = { onClose: () => void; onAttach: (c: any) => void };

export function CustomerAttachModal({ onClose, onAttach }: Props) {
  const [tab, setTab] = useState<'search'|'create'>('search');
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>اختيار العميل</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v)=> setTab(v)} sx={{ mb: 1 }}>
          <Tab value="search" label="بحث" />
          <Tab value="create" label="إنشاء سريع" />
        </Tabs>
        {tab === 'search' && (
          <CustomerSearch onSelect={(c)=> setSelected(c)} />
        )}
        {tab === 'create' && (
          <QuickCreate onCreated={(c)=> { setSelected(c); setTab('search'); }} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button disabled={!selected} onClick={()=> selected && onAttach(selected)} variant="contained">إرفاق</Button>
      </DialogActions>
    </Dialog>
  );
}

