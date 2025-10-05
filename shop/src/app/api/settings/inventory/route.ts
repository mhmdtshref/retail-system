import { NextResponse } from 'next/server';
import { z } from 'zod';

// Simple in-memory for reasons; could be persisted later
const g = globalThis as unknown as { __inventorySettings?: { reasons: string[] } };
if (!g.__inventorySettings) {
  g.__inventorySettings = { reasons: ['كسر/تالف','فقدان','تصحيح إدخال','جرد'] };
}

const ReasonsSchema = z.object({ reasons: z.array(z.string().min(1)).min(1) });

export async function GET() {
  return NextResponse.json(g.__inventorySettings);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const parsed = ReasonsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  g.__inventorySettings = { reasons: parsed.data.reasons };
  return NextResponse.json(g.__inventorySettings);
}


