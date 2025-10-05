import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const summary = mockDb.getCustomerCreditSummary(id);
  return NextResponse.json(summary);
}


