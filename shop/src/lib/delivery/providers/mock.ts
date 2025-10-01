import { Provider, CreateShipmentResult } from '../index';
import { mockDb } from '@/lib/mock/store';

// In-memory mock provider lifecycle map
const g = globalThis as unknown as { __mockShipments?: Map<string, { status: string; createdAt: number }> };
if (!g.__mockShipments) g.__mockShipments = new Map();
const mem = g.__mockShipments;

function nextStatus(cur: string): string {
  const flow = ['created','in_transit','out_for_delivery','delivered'];
  const idx = flow.indexOf(cur);
  if (idx === -1) return 'created';
  return flow[Math.min(flow.length - 1, idx + 1)];
}

export const provider: Provider = {
  async createShipment({ saleId }): Promise<CreateShipmentResult> {
    const externalId = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mem.set(externalId, { status: 'created', createdAt: Date.now() });
    // emulate label/policy urls
    return { externalId, labelUrl: `/mock/label/${externalId}.pdf`, policyUrl: `/mock/policy/${externalId}` };
  },
  async getStatus(externalId: string): Promise<{ status: string; payload?: any }> {
    const cur = mem.get(externalId) || { status: 'created', createdAt: Date.now() };
    const next = nextStatus(cur.status);
    mem.set(externalId, { ...cur, status: next });
    return { status: next, payload: { from: cur.status, to: next } };
  },
  verifyWebhook(sig: string, body: string): boolean {
    // mock verification: signature equals reversed body length as string
    try {
      const expected = String(body.length).split('').reverse().join('');
      return sig === expected;
    } catch {
      return false;
    }
  }
};



