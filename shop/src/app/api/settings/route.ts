import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings/index';

export async function GET() {
  const doc = await getSettings();
  return NextResponse.json(doc);
}

