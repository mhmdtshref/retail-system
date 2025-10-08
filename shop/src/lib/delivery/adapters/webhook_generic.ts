import type { CarrierAdapter, CreatePayload, CreateResult, CancelResult, LabelResult, TrackResult, WebhookEvent } from './types';
import type { CarrierAccountDoc as CarrierAccount } from '@/lib/models/CarrierAccount';
import type { ShipmentDoc as Shipment } from '@/lib/models/Shipment';
import { buildLabelsPdf } from '@/lib/labels/pdf';
import fs from 'fs';
import path from 'path';
import { verifyHmacSha256 } from '@/lib/delivery/signature';

function publicPath(...p: string[]): string {
  return path.join(process.cwd(), 'public', ...p);
}

async function ensureDir(p: string) {
  await fs.promises.mkdir(p, { recursive: true });
}

export const GenericWebhookAdapter: CarrierAdapter = {
  async createShipment(payload: CreatePayload, account: CarrierAccount): Promise<CreateResult> {
    const trackingNumber = `WH-${Date.now().toString(36).toUpperCase()}`;
    // Generate local label PDF with branding
    const pdf = await buildLabelsPdf('thermal-80', [{ sku: trackingNumber, name_ar: payload.to.name, price: undefined, qty: 1 } as any], { barcodeType: 'code128', show: { name: true, sku: true }, shop: { name: account.name } } as any);
    const dir = publicPath('labels','webhook');
    await ensureDir(dir);
    const filename = `${trackingNumber}.pdf`;
    const full = path.join(dir, filename);
    await fs.promises.writeFile(full, Buffer.from(pdf));
    return { trackingNumber, labelUrl: `/labels/webhook/${filename}`, status: 'label_generated', events: [{ status: 'label_generated', at: new Date().toISOString(), code: 'LABEL' }] };
  },
  async cancelShipment(_shipment: Shipment, _account: CarrierAccount): Promise<CancelResult> {
    return { ok: true, status: 'cancelled', events: [{ status: 'cancelled', at: new Date().toISOString(), code: 'CANCELLED' }] };
  },
  async getLabel(shipment: Shipment, _account: CarrierAccount): Promise<LabelResult> {
    return { labelUrl: shipment.labelUrl };
  },
  async track(_trackingNumber: string, _account: CarrierAccount): Promise<TrackResult> {
    // For webhook generic, tracking relies on webhooks; return last known state requesters should already have
    return { status: 'in_transit', events: [] };
  },
  async parseWebhook(req: Request, account: CarrierAccount): Promise<WebhookEvent> {
    const rawBody = await req.text();
    const sig = req.headers.get('x-signature') || req.headers.get('x-hub-signature');
    if (account.credentials?.webhookSecret) {
      const ok = verifyHmacSha256(rawBody, account.credentials.webhookSecret, sig || undefined);
      if (!ok) throw new Error('INVALID_SIGNATURE');
    }
    const json = JSON.parse(rawBody || '{}');
    const trackingNumber = json.trackingNumber || json.tracking || json.id || '';
    const statusMap: Record<string, Shipment['status']> = {
      created: 'created',
      label: 'label_generated',
      handover: 'handover',
      in_transit: 'in_transit',
      out_for_delivery: 'out_for_delivery',
      delivered: 'delivered',
      failed: 'failed',
      returned: 'returned',
      cancelled: 'cancelled'
    };
    const status = statusMap[String(json.status || '').toLowerCase()] || 'in_transit';
    return { trackingNumber, status, events: [{ status, at: new Date().toISOString(), code: json.status, raw: json }], verified: !!account.credentials?.webhookSecret };
  }
};

