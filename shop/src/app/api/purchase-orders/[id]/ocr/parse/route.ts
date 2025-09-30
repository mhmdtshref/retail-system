import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseRawText, PARSER_VERSION } from '@/lib/ocr/parser';
import { mockDb } from '@/lib/mock/store';

const BodySchema = z.object({ rawText: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const po = mockDb.getPO(params.id);
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const lines = parseRawText(parsed.data.rawText);
  mockDb.setPOOcr(params.id, parsed.data.rawText, PARSER_VERSION);
  return NextResponse.json({ parsed: lines, parserVersion: PARSER_VERSION });
}

