import { verifyHmacSha256 } from '@/lib/delivery/signature';

export function verifyWebhookHmac({ header, payload, secret }: { header?: string | null; payload: string; secret?: string }) {
  const ok = verifyHmacSha256(payload, secret, header || undefined);
  if (!ok) throw new Error('INVALID_SIGNATURE');
}
