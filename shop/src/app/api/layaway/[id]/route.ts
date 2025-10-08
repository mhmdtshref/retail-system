import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { Layaway } from '@/lib/models/Layaway';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  const d = await Layaway.findById(id).lean();
  if (!d) return NextResponse.json({ error: { message: 'غير موجود' } }, { status: 404 });
  return NextResponse.json({ layaway: d });
}

