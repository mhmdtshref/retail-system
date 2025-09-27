import { Schema, model, models, Types } from 'mongoose';

const StockMovementSchema = new Schema({
  sku: { type: String, required: true, index: true },
  type: { type: String, enum: ['PURCHASE', 'SALE', 'RETURN', 'ADJUST', 'RESERVE', 'RELEASE'], required: true },
  quantity: { type: Number, required: true }, // positive for in, negative for out
  refId: { type: Types.ObjectId, index: true },
}, { timestamps: true });

export const StockMovement = models.StockMovement || model('StockMovement', StockMovementSchema);

