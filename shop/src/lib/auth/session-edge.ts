import { type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export type SessionUser = { id: string; role: 'owner'|'manager'|'cashier'|'staff'|'viewer'; name?: string; email?: string; status: 'active'|'disabled' };

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(/;\s*/);
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1);
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

export async function getSessionUserFromRequestEdge(req: NextRequest): Promise<SessionUser | null> {
  const cookieHeader = req.headers.get('cookie');
  const token =
    parseCookie(cookieHeader, '__Host-next-auth.session-token') ||
    parseCookie(cookieHeader, '__Secure-next-auth.session-token') ||
    parseCookie(cookieHeader, 'next-auth.session-token');
  if (!token) return null;
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret';
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const id = String(payload.sub || '');
    if (!id) return null;
    const role = (payload as any).role || 'viewer';
    const name = (payload as any).name || undefined;
    const email = (payload as any).email || undefined;
    return { id, role, name, email, status: 'active' };
  } catch {
    return null;
  }
}


