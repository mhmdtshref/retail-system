import { NextRequest, NextResponse } from 'next/server';
import { BackupJob } from '@/lib/models/BackupJob';
import { dbConnect } from '@/lib/db/mongo';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  const job = await BackupJob.findById(params.id).lean();
  if (!job) return NextResponse.json({ error: { message: 'not found' } }, { status: 404 });
  return NextResponse.json({ job });
}
