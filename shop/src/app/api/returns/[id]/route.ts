import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
	const { id } = await context.params;
	const doc = mockDb.getReturn(id);
	if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
	return NextResponse.json({ return: doc });
}


