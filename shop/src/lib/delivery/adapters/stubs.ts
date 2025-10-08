import type { CarrierAdapter, CreatePayload, CreateResult, CancelResult, LabelResult, TrackResult, WebhookEvent } from './types';
import type { CarrierAccountDoc as CarrierAccount } from '@/lib/models/CarrierAccount';
import type { ShipmentDoc as Shipment } from '@/lib/models/Shipment';

function notConfigured(): never {
  const err = Object.assign(new Error('NOT_CONFIGURED'), { code: 'NOT_CONFIGURED' });
  throw err;
}

function makeStub(): CarrierAdapter {
  return {
    async createShipment(_payload: CreatePayload, _account: CarrierAccount): Promise<CreateResult> { notConfigured(); },
    async cancelShipment(_shipment: Shipment, _account: CarrierAccount): Promise<CancelResult> { notConfigured(); },
    async getLabel(_shipment: Shipment, _account: CarrierAccount): Promise<LabelResult> { notConfigured(); },
    async track(_trackingNumber: string, _account: CarrierAccount): Promise<TrackResult> { notConfigured(); },
    async parseWebhook(_req: Request, _account: CarrierAccount): Promise<WebhookEvent> { notConfigured(); }
  };
}

export const SMSAAdapter: CarrierAdapter = makeStub();
export const DHLAdapter: CarrierAdapter = makeStub();
export const FedExAdapter: CarrierAdapter = makeStub();

