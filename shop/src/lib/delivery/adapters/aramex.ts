import type { CarrierAdapter, CreatePayload, CreateResult, CancelResult, LabelResult, TrackResult, WebhookEvent } from './types';
import type { CarrierAccountDoc as CarrierAccount } from '@/lib/models/CarrierAccount';
import type { ShipmentDoc as Shipment } from '@/lib/models/Shipment';

function requireConfigured(account: CarrierAccount) {
  const required = ['apiKey','username','password','accountNo'];
  for (const k of required) {
    if (!account.credentials || !account.credentials[k]) {
      throw Object.assign(new Error('NOT_CONFIGURED'), { code: 'NOT_CONFIGURED', field: k });
    }
  }
}

function mapStatus(code: string): Shipment['status'] {
  const map: Record<string, Shipment['status']> = {
    CREATED: 'created',
    LABEL: 'label_generated',
    HANDED: 'handover',
    TRANSIT: 'in_transit',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    FAILED: 'failed',
    RETURNED: 'returned',
    CANCELLED: 'cancelled'
  };
  return map[code] || 'in_transit';
}

async function fakeHttpCall<T>(_: any): Promise<T> {
  // Placeholder for actual Aramex API calls; respond with mocked structures for now
  return {} as T;
}

export const AramexAdapter: CarrierAdapter = {
  async createShipment(payload: CreatePayload, account: CarrierAccount): Promise<CreateResult> {
    requireConfigured(account);
    // TODO: integrate real Aramex create shipment call
    const trackingNumber = `ARMX-${Date.now().toString(36).toUpperCase()}`;
    return { trackingNumber, status: 'created', events: [{ status: 'created', at: new Date().toISOString(), code: 'CREATED' }] };
  },
  async cancelShipment(_shipment: Shipment, account: CarrierAccount): Promise<CancelResult> {
    requireConfigured(account);
    // TODO: call cancel API; assume success
    return { ok: true, status: 'cancelled', events: [{ status: 'cancelled', at: new Date().toISOString(), code: 'CANCELLED' }] };
  },
  async getLabel(shipment: Shipment, account: CarrierAccount): Promise<LabelResult> {
    requireConfigured(account);
    // TODO: fetch label from Aramex; for now return placeholder path
    return { labelUrl: `/labels/aramex/${shipment.trackingNumber}.pdf` };
  },
  async track(trackingNumber: string, account: CarrierAccount): Promise<TrackResult> {
    requireConfigured(account);
    // TODO: call tracking API; provide basic mock progression
    const now = Date.now();
    const seq = ['created','in_transit','out_for_delivery','delivered'] as Shipment['status'][];
    const idx = Math.min(seq.length - 1, Math.floor(((now / 1000) % 100) / 25));
    const status = seq[idx];
    return { status, events: [{ status, at: new Date().toISOString(), code: status.toUpperCase() }] };
  },
  async parseWebhook(req: Request, account: CarrierAccount): Promise<WebhookEvent> {
    // Optional HMAC verification via account.credentials.webhookSecret
    const body = await req.text();
    const json = JSON.parse(body || '{}');
    const trackingNumber = json.trackingNumber || json.tracking || json.awb || '';
    const statusCode = json.statusCode || json.status || 'TRANSIT';
    const status = mapStatus(String(statusCode).toUpperCase());
    // TODO: verify signature if present
    return { trackingNumber, status, events: [{ status, at: new Date().toISOString(), code: statusCode, raw: json }], verified: true };
  }
};

