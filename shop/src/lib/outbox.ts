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


