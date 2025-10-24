"use client";
import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Paper } from '@mui/material';

export type Column<T> = { key: keyof T | string; header: React.ReactNode; width?: number | string; cell?: (row: T) => React.ReactNode };

export function VirtualTable<T extends { _id?: string }>(props: { rows: T[]; columns: Column<T>[]; rowKey?: (row: T, i: number) => string; estimatedRowHeight?: number }) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rows = props.rows || [];
  const estimatedSize = props.estimatedRowHeight ?? 40;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedSize,
    overscan: 10,
  });

  const totalSize = rowVirtualizer.getTotalSize();
  const virtualItems = rowVirtualizer.getVirtualItems();

  const header = useMemo(() => (
    <Box dir="rtl" sx={{ display: 'grid', gridTemplateColumns: props.columns.map(c => c.width || '1fr').join(' '), gap: 1, p: 1, position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.paper', backdropFilter: 'blur(6px)', fontSize: 12, color: 'text.secondary' }}>
      {props.columns.map((c, i) => (
        <Box key={i} sx={{ px: 1, py: 0.5, whiteSpace: 'nowrap' }}>{c.header}</Box>
      ))}
    </Box>
  ), [props.columns]);

  return (
    <Paper ref={parentRef as any} variant="outlined" dir="rtl" sx={{ overflow: 'auto', height: '60vh' }}>
      {header}
      <Box sx={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((vi) => {
          const row = rows[vi.index];
          const key = props.rowKey ? props.rowKey(row, vi.index) : (row?._id || String(vi.index));
          return (
            <Box key={key} sx={{ display: 'grid', gridTemplateColumns: props.columns.map(c => c.width || '1fr').join(' '), gap: 1, p: 1, fontSize: 14, borderTop: (t)=> `1px solid ${t.palette.divider}`, position: 'absolute', left: 0, right: 0, transform: `translateY(${vi.start}px)` }}>
              {props.columns.map((c, i) => (
                <Box key={i} sx={{ px: 1, py: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.cell ? c.cell(row) : (row as any)[c.key as string]}
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
