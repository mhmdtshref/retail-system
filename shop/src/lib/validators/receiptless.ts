import { z } from 'zod';

export const ReturnMethodSchema = z.enum(['CASH','CARD','STORE_CREDIT']);
export const InventoryActionSchema = z.enum(['NONE','PUT_BACK','WRITE_OFF']);

export const ReceiptlessReturnCreateSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(1),
  method: ReturnMethodSchema,
  reason: z.string().optional(),
  note: z.string().optional(),
  inventory: z
    .object({
      action: InventoryActionSchema,
      locationId: z.string().optional(),
      reference: z.string().optional()
    })
    .optional(),
  customerId: z.string().optional(),
  attachments: z
    .array(z.object({ url: z.string().url(), type: z.string().min(1) }))
    .max(1)
    .optional()
});

export const ReceiptlessReturnListQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  storeId: z.string().optional(),
  cashierId: z.string().optional(),
  status: z.enum(['APPROVED','DENIED','VOIDED','POSTED']).optional(),
  method: ReturnMethodSchema.optional()
});

export type ReceiptlessReturnCreate = z.infer<typeof ReceiptlessReturnCreateSchema>;
export type ReceiptlessReturnListQuery = z.infer<typeof ReceiptlessReturnListQuerySchema>;
