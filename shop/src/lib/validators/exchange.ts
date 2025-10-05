import { z } from 'zod';

export const ExchangeReturnLineSchema = z.object({
	sku: z.string().min(1),
	qty: z.number().int().positive(),
	unitPrice: z.number().nonnegative(),
	reason: z.string().min(1)
});

export const ExchangeNewLineSchema = z.object({
	sku: z.string().min(1),
	qty: z.number().int().positive(),
	unitPrice: z.number().nonnegative()
});

export const SettlementSchema = z.object({
	customerOwes: z.number().nonnegative(),
	shopOwes: z.number().nonnegative(),
	paidMethod: z.enum(['cash','card']).optional(),
	refundMethod: z.enum(['cash','card','store_credit']).optional()
});

export const ExchangeCreateSchema = z.object({
	originalSaleId: z.string().min(1),
	returnLines: z.array(ExchangeReturnLineSchema).min(1),
	newLines: z.array(ExchangeNewLineSchema).min(1),
	settlement: SettlementSchema,
	notes: z.string().optional(),
	override: z
		.object({ by: z.string().min(1), reason: z.string().min(1) })
		.optional()
});

export type ExchangeCreate = z.infer<typeof ExchangeCreateSchema>;


