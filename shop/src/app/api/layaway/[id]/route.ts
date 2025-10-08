import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { Layaway } from '@/lib/models/Layaway';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  const doc = await Layaway.findById(params.id).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(doc);
}

