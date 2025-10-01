export interface CreateShipmentResult { externalId: string; labelUrl?: string; policyUrl?: string }
export interface Provider {
  createShipment(input: { saleId: string }): Promise<CreateShipmentResult>;
  getStatus(externalId: string): Promise<{ status: string; payload?: any }>;
  verifyWebhook(sig: string, body: string): boolean;
}

import { provider as mockProvider } from './providers/mock';

export function getProvider(): Provider {
  return mockProvider;
}



