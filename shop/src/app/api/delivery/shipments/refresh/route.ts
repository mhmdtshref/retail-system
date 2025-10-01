import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';
import { getProvider } from '@/lib/delivery';

export async function POST() {
  const provider = getProvider();
  const res = await mockDb.refreshNonTerminalShipments((externalId) => provider.getStatus(externalId));
  return NextResponse.json(res);
}



