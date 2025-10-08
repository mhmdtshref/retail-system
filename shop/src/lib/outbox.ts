"use client";
import { posDb } from '@/lib/db/posDexie';
import { uuid } from '@/lib/pos/idempotency';

export async function enqueueReturnCreate(input: { localId: string; saleId: string; lines: Array<{ sku: string; qty: number; unitPrice: number; reason: string; condition?: string }>; refund: { method: 'cash'|'card'|'store_credit'; amount: number }; notes?: string }) {
	const id = uuid();
	await posDb.outbox.add({ id, type: 'RETURN_CREATE', payload: input, idempotencyKey: `return:${input.localId}`, createdAt: Date.now(), retryCount: 0 });
}

export async function enqueueExchangeCreate(input: { localId: string; originalSaleId: string; returnLines: Array<{ sku: string; qty: number; unitPrice: number; reason: string }>; newLines: Array<{ sku: string; qty: number; unitPrice: number }>; settlement: { customerOwes: number; shopOwes: number; paidMethod?: 'cash'|'card'; refundMethod?: 'cash'|'card'|'store_credit' }; notes?: string }) {
	const id = uuid();
	await posDb.outbox.add({ id, type: 'EXCHANGE_CREATE', payload: input, idempotencyKey: `exchange:${input.localId}`, createdAt: Date.now(), retryCount: 0 });
}

export async function enqueueCustomerCreate(input: any) {
	const id = uuid();
	await posDb.outbox.add({ id, type: 'CUSTOMER_CREATE', payload: input, idempotencyKey: `customer:create:${input.localId || id}`, createdAt: Date.now(), retryCount: 0 });
}

export async function enqueueCustomerUpdate(idOrLocal: string, patch: any) {
	const id = uuid();
	await posDb.outbox.add({ id, type: 'CUSTOMER_UPDATE', payload: { id: idOrLocal, patch }, idempotencyKey: `customer:update:${idOrLocal}:${Date.now()}`, createdAt: Date.now(), retryCount: 0 });
}

export async function enqueueShipmentCreate(input: { localId: string; payload: { orderId: string; to: any; cod?: any; weightKg?: number; pieces?: number; service?: string } }) {
	const id = uuid();
	await posDb.outbox.add({ id, type: 'SHIPMENT_CREATE', payload: input.payload, idempotencyKey: `shipment:create:${input.localId}`, createdAt: Date.now(), retryCount: 0 });
}

export async function enqueueShipmentCancel(input: { shipmentId: string }) {
	const id = uuid();
	await posDb.outbox.add({ id, type: 'SHIPMENT_CANCEL', payload: { shipmentId: input.shipmentId }, idempotencyKey: `shipment:cancel:${input.shipmentId}:${Date.now()}`, createdAt: Date.now(), retryCount: 0 });
}

export async function enqueueNotificationSend(input: { localId: string; payload: { event: string; entity: { type: 'order'|'layaway'; id: string }; customerId: string; channels?: Array<'email'|'sms'|'whatsapp'>; data?: any } }) {
  const id = uuid();
  await posDb.outbox.add({ id, type: 'NOTIF_SEND', payload: input.payload, idempotencyKey: `notif:${input.localId}`, createdAt: Date.now(), retryCount: 0 });
}


