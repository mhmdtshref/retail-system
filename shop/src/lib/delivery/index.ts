export interface CreateShipmentResult { externalId: string; labelUrl?: string; policyUrl?: string }
export type DeliveryStatus = 'created'|'in_transit'|'out_for_delivery'|'delivered'|'failed'|'returned';
export interface Provider {
  createShipment(input: { saleId: string }): Promise<CreateShipmentResult>;
  getStatus(externalId: string): Promise<{ status: DeliveryStatus; payload?: any }>;
  verifyWebhook(sig: string, body: string): boolean;
}

import { provider as mockProvider } from './providers/mock';

export function getProvider(): Provider {
  return mockProvider;
}



