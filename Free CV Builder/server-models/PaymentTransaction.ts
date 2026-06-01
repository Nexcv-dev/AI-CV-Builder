import mongoose, { Document, Schema } from 'mongoose';
import { PAID_BILLING_PLANS, type BillingPlan } from './userPlan';

export interface IPaymentTransaction extends Document {
  provider: 'payhere' | 'lemonsqueezy';
  paymentId: string;
  orderId: string;
  userId?: mongoose.Types.ObjectId;
  plan?: Exclude<BillingPlan, 'free'>;
  amount?: string;
  currency?: string;
  baseAmountCents?: number;
  discountCents?: number;
  finalAmountCents?: number;
  couponCode?: string;
  statusCode: string;
  processed: boolean;
  processingStartedAt?: Date;
  processedAt?: Date;
  billingReviewStatus?: 'open' | 'resolved';
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewNote?: string;
  rawPayload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    provider: { type: String, enum: ['payhere', 'lemonsqueezy'], default: 'payhere', required: true },
    paymentId: { type: String, required: true },
    orderId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    plan: { type: String, enum: PAID_BILLING_PLANS },
    amount: { type: String },
    currency: { type: String },
    baseAmountCents: { type: Number },
    discountCents: { type: Number },
    finalAmountCents: { type: Number },
    couponCode: { type: String, uppercase: true, trim: true },
    statusCode: { type: String, required: true },
    processed: { type: Boolean, default: false, required: true },
    processingStartedAt: { type: Date },
    processedAt: { type: Date },
    billingReviewStatus: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, maxlength: 500 },
    rawPayload: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

PaymentTransactionSchema.index({ provider: 1, paymentId: 1 }, { unique: true });
PaymentTransactionSchema.index({ orderId: 1 });
PaymentTransactionSchema.index({ userId: 1, createdAt: -1 });
PaymentTransactionSchema.index({ processed: 1, billingReviewStatus: 1, createdAt: -1 });

const PaymentTransaction =
  (mongoose.models.PaymentTransaction as mongoose.Model<IPaymentTransaction>) ||
  mongoose.model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema);

export default PaymentTransaction;
