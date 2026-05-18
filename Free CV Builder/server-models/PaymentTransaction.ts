import mongoose, { Document, Schema } from 'mongoose';
import type { BillingPlan } from './userPlan';

export interface IPaymentTransaction extends Document {
  provider: 'payhere';
  paymentId: string;
  orderId: string;
  userId?: mongoose.Types.ObjectId;
  plan?: Exclude<BillingPlan, 'free'>;
  amount?: string;
  currency?: string;
  statusCode: string;
  processed: boolean;
  rawPayload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    provider: { type: String, enum: ['payhere'], default: 'payhere', required: true },
    paymentId: { type: String, required: true },
    orderId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    plan: { type: String, enum: ['payg', 'monthly'] },
    amount: { type: String },
    currency: { type: String },
    statusCode: { type: String, required: true },
    processed: { type: Boolean, default: false, required: true },
    rawPayload: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

PaymentTransactionSchema.index({ provider: 1, paymentId: 1 }, { unique: true });
PaymentTransactionSchema.index({ orderId: 1 });
PaymentTransactionSchema.index({ userId: 1, createdAt: -1 });

const PaymentTransaction =
  (mongoose.models.PaymentTransaction as mongoose.Model<IPaymentTransaction>) ||
  mongoose.model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema);

export default PaymentTransaction;
