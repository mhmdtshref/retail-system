import { NextResponse } from 'next/server';
import { LabelsPreviewBodySchema } from '@/lib/validators/labels';
import { buildLabelsPdf } from '@/lib/labels/pdf';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LabelsPreviewBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { template, items, options } = parsed.data;
    const pdfBytes = await buildLabelsPdf(template, items, options);
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="labels-preview.pdf"',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}
