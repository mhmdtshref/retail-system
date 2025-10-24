"use client";
import React from 'react';
import { reportError } from '@/lib/obs/errors';
import { Alert, Box } from '@mui/material';

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{ fallback?: React.ReactNode }>, { hasError: boolean }>{
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(_error: any) { return { hasError: true }; }
  async componentDidCatch(error: any, _info: any) {
    await reportError({ error, breadcrumbs: [{ type: 'ui', message: 'React boundary capture', ts: Date.now() }] });
  }
  render() {
    if (this.state.hasError) return this.props.fallback || (
      <Box dir="rtl" sx={{ p: 2 }}>
        <Alert severity="error" variant="outlined">
          حدث خطأ غير متوقع. يمكنك المتابعة، وسيتم إرسال تقرير مجهول.
        </Alert>
      </Box>
    );
    return this.props.children;
  }
}
