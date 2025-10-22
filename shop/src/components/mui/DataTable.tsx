"use client";
import * as React from 'react';
import { DataGrid, DataGridProps, GridToolbarQuickFilter } from '@mui/x-data-grid';
import { Box } from '@mui/material';

export type AppDataTableProps = DataGridProps & {
  height?: number | string;
};

export function DataTable({ height = 520, ...props }: AppDataTableProps) {
  return (
    <Box sx={{ height, width: '100%', '& .MuiDataGrid-toolbarContainer': { p: 1 } }}>
      <DataGrid
        density="compact"
        disableRowSelectionOnClick
        slots={{ toolbar: GridToolbarQuickFilter }}
        {...props}
      />
    </Box>
  );
}
