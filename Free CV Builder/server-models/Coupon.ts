import mongoose, { Document, Schema } from 'mongoose';
import type { BillingPlan } from './userPlan';

export interface ICoupon extends Document {
  code: string;
  label: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  active: boolean;
  appliesTo: Array<Exclude<BillingPlan, 'free'>>;
  startsAt?: Date;
  expiresAt?: Date;
  maxRedemptions?: number;
  redeemedCount: number;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 32, index: true },
    label: { type: String, required: true, trim: true, maxlength: 100 },
    discountType: { type: String, enum: ['fixed', 'percent'], required: true },
    discountValue: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true, required: true, index: true },
    appliesTo: [{ type: String, enum: ['payg', 'monthly'] }],
    startsAt: { type: Date },
    expiresAt: { type: Date },
    maxRedemptions: { type: Number, min: 1 },
    redeemedCount: { type: Number, default: 0, min: 0, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Coupon =
  (mongoose.models.Coupon as mongoose.Model<ICoupon>) ||
  mongoose.model<ICoupon>('Coupon', CouponSchema);

export default Coupon;
