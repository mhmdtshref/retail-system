import { z } from 'zod';

export const ReturnLineSchema = z.object({
	sku: z.string().min(1),
	qty: z.number().int().positive(),
	unitPrice: z.number().nonnegative(),
	reason: z.string().min(1),
	condition: z.string().optional()
});

export const RefundSchema = z.object({
	method: z.enum(['cash','card','store_credit']),
	amount: z.number().nonnegative(),
	status: z.enum(['confirmed','pending']).default('confirmed')
});

export const ReturnCreateSchema = z.object({
	saleId: z.string().min(1),
	lines: z.array(ReturnLineSchema).min(1),
	refund: RefundSchema,
	notes: z.string().optional(),
	override: z
		.object({ by: z.string().min(1), reason: z.string().min(1) })
		.optional()
});

export type ReturnCreate = z.infer<typeof ReturnCreateSchema>;


