import type { CarrierAccountDoc as CarrierAccount } from '@/lib/models/CarrierAccount';
import type { ShipmentDoc as Shipment } from '@/lib/models/Shipment';

export type TimelineEvent = { code?: string; status: Shipment['status']; desc?: string; at: string; raw?: any };

export type CreatePayload = {
  orderId: string;
  to: Shipment['to'];
  cod?: Shipment['cod'];
  weightKg?: number;
  pieces?: number;
  service?: string;
};

export type CreateResult = { trackingNumber?: string; labelUrl?: string; status?: Shipment['status']; events?: TimelineEvent[] };
export type CancelResult = { ok: boolean; status?: Shipment['status']; events?: TimelineEvent[] };
export type LabelResult = { labelUrl?: string };
export type TrackResult = { status: Shipment['status']; events: TimelineEvent[] };
export type WebhookEvent = { trackingNumber: string; status: Shipment['status']; events?: TimelineEvent[]; verified?: boolean };

export interface CarrierAdapter {
  createShipment(payload: CreatePayload, account: CarrierAccount): Promise<CreateResult>;
  cancelShipment(shipment: Shipment, account: CarrierAccount): Promise<CancelResult>;
  getLabel(shipment: Shipment, account: CarrierAccount): Promise<LabelResult>;
  track(trackingNumber: string, account: CarrierAccount): Promise<TrackResult>;
  parseWebhook(req: Request, account: CarrierAccount): Promise<WebhookEvent>;
}

