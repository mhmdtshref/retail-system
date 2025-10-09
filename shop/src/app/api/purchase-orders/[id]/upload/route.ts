import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock/store';
import { parseRawText, PARSER_VERSION } from '@/lib/ocr/parser';
import { writeAudit } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  // Validate size and MIME
  const maxBytes = 2 * 1024 * 1024; // 2MB
  if ((file as any).size && (file as any).size > maxBytes) {
    await writeAudit({ action: 'settings.update', status: 'denied', entity: { type: 'PO', id: (await context.params).id }, meta: { reason: 'oversize_upload' } as any });
    return NextResponse.json({ error: 'الملف كبير جداً' }, { status: 413 });
  }
  const allowed = ['text/plain', 'application/pdf', 'image/png', 'image/jpeg'];
  if (file.type && !allowed.includes(file.type)) {
    await writeAudit({ action: 'settings.update', status: 'denied', entity: { type: 'PO', id: (await context.params).id }, meta: { reason: 'bad_mime', mime: file.type } as any });
    return NextResponse.json({ error: 'نوع الملف غير مدعوم' }, { status: 415 });
  }

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
  await writeAudit({ action: 'settings.update', status: 'success', entity: { type: 'PO', id }, meta: { uploaded: !!file.name, mime: file.type || '' } as any });
  return NextResponse.json({ fileUrl: fakeUrl, rawText, parsed });
}

