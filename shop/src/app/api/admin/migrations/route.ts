import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { applyMigrations, listMigrations, revertMigrations, type Migration } from '@/lib/migrations/runner';

// Placeholder registry; real migrations can be added by importing from src/migrations
const registry: Migration[] = [];

export async function GET(_req: NextRequest) {
  const list = await listMigrations(registry);
  return NextResponse.json(list);
}

const applySchema = z.object({ toVersion: z.string().optional(), dryRun: z.boolean().optional() });
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const canRes = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (canRes !== true) return canRes;

  const body = await req.json();
  const input = applySchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: { message: input.error.message } }, { status: 400 });
  const { toVersion, dryRun } = input.data;
  await applyMigrations(registry, toVersion, !!dryRun);
  return NextResponse.json({ ok: true });
}

const revertSchema = z.object({ steps: z.number().optional(), dryRun: z.boolean().optional() });
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const canRes = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (canRes !== true) return canRes;

  const body = await req.json();
  const input = revertSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: { message: input.error.message } }, { status: 400 });
  const { steps, dryRun } = input.data;
  await revertMigrations(registry, steps || 1, !!dryRun);
  return NextResponse.json({ ok: true });
}
