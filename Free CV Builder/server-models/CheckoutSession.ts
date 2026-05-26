import mongoose, { Document, Schema } from 'mongoose';
import type { BillingPlan } from './userPlan';

export interface ICheckoutSession extends Document {
  orderId: string;
  userId: mongoose.Types.ObjectId;
  plan: Exclude<BillingPlan, 'free'>;
  currency: 'LKR';
  baseAmountCents: number;
  discountCents: number;
  finalAmountCents: number;
  couponCode?: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  billingReviewStatus?: 'open' | 'resolved';
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewNote?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CheckoutSessionSchema = new Schema<ICheckoutSession>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, enum: ['payg', 'monthly'], required: true },
    currency: { type: String, enum: ['LKR'], default: 'LKR', required: true },
    baseAmountCents: { type: Number, required: true, min: 0 },
    discountCents: { type: Number, required: true, min: 0 },
    finalAmountCents: { type: Number, required: true, min: 0 },
    couponCode: { type: String, uppercase: true, trim: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'expired'], default: 'pending', required: true, index: true },
    billingReviewStatus: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, maxlength: 500 },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

CheckoutSessionSchema.index({ userId: 1, createdAt: -1 });
CheckoutSessionSchema.index({ status: 1, billingReviewStatus: 1, updatedAt: -1 });

const CheckoutSession =
  (mongoose.models.CheckoutSession as mongoose.Model<ICheckoutSession>) ||
  mongoose.model<ICheckoutSession>('CheckoutSession', CheckoutSessionSchema);

export default CheckoutSession;
