import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { getObsRuntimeConfig, setObsRuntimeConfig } from '@/lib/obs/config';

const ObsSettingsSchema = z.object({
  sampling: z.object({ info: z.number().min(0).max(1).optional(), debug: z.number().min(0).max(1).optional() }).optional(),
  clientLogsEnabled: z.boolean().optional(),
  metrics: z.object({ exposePublic: z.boolean().optional() }).optional(),
});

export async function GET() {
  return NextResponse.json(getObsRuntimeConfig());
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (allowed !== true) return allowed;
  try {
    const body = await req.json();
    const parsed = ObsSettingsSchema.parse(body);
    setObsRuntimeConfig(parsed as any);
    return NextResponse.json(getObsRuntimeConfig());
  } catch {
    return NextResponse.json({ error: { message: 'صيغة غير صحيحة' } }, { status: 400 });
  }
}
