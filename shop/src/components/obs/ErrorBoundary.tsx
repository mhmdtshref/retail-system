"use client";
import React from 'react';
import { reportError } from '@/lib/obs/errors';

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{ fallback?: React.ReactNode }>, { hasError: boolean }>{
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(_error: any) { return { hasError: true }; }
  async componentDidCatch(error: any, _info: any) {
    await reportError({ error, breadcrumbs: [{ type: 'ui', message: 'React boundary capture', ts: Date.now() }] });
  }
  render() {
    if (this.state.hasError) return this.props.fallback || (
      <div dir="rtl" className="p-4 text-rose-700">
        حدث خطأ غير متوقع. يمكنك المتابعة، وسيتم إرسال تقرير مجهول.
      </div>
    );
    return this.props.children;
  }
}
