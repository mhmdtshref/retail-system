import { NextResponse } from 'next/server';
import { LabelsZplBodySchema } from '@/lib/validators/labels';
import { buildZplForItems } from '@/lib/labels/zpl';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LabelsZplBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { items, options } = parsed.data;
    const zpl = buildZplForItems(items, options);
    return new NextResponse(zpl, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="labels.zpl"',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}
