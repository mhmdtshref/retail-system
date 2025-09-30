import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';
import { parseRawText, PARSER_VERSION } from '@/lib/ocr/parser';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

  // Dev: store in-memory URL (no FS write in serverless by default). In local dev, could write to /public/uploads.
  // Create a data URL without Buffer to avoid node type dependency
  const arr = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  const base64 = typeof btoa !== 'undefined' ? btoa(binary) : (globalThis as any).Buffer?.from(arr)?.toString('base64') || '';
  const fakeUrl = base64 ? `data:${file.type};base64,${base64}` : '';

  const text = await file.text().catch(() => '');
  const rawText = text && text.trim().length > 0 ? text : '';

  const { id } = await context.params;
  mockDb.addPOAttachment(id, fakeUrl);
  if (rawText) {
    mockDb.setPOOcr(id, rawText, PARSER_VERSION);
  }
  const parsed = rawText ? parseRawText(rawText) : [];
  return NextResponse.json({ fileUrl: fakeUrl, rawText, parsed });
}

