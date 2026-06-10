import mongoose, { Document, Schema } from 'mongoose';
import { PAID_BILLING_PLANS, type BillingPlan } from './userPlan';

export interface IBillingPlanSetting extends Document {
  plan: Exclude<BillingPlan, 'free'>;
  label: string;
  amountCents: number;
  currency: 'LKR';
  prices?: Array<{
    market: 'local' | 'global';
    amountCents: number;
    currency: 'LKR' | 'USD';
    provider: 'payhere' | 'lemonsqueezy';
    active: boolean;
    promotionActive?: boolean;
    promotionLabel?: string;
    promotionDiscountType?: 'fixed' | 'percent';
    promotionDiscountValue?: number;
  }>;
  active: boolean;
  promotionActive: boolean;
  promotionLabel?: string;
  promotionDiscountType?: 'fixed' | 'percent';
  promotionDiscountValue?: number;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BillingPlanSettingSchema = new Schema<IBillingPlanSetting>(
  {
    plan: { type: String, enum: PAID_BILLING_PLANS, required: true, unique: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    amountCents: { type: Number, required: true, min: 100, max: 10_000_000 },
    currency: { type: String, enum: ['LKR'], default: 'LKR', required: true },
    prices: {
      type: [{
        market: { type: String, enum: ['local', 'global'], required: true },
        amountCents: { type: Number, required: true, min: 100, max: 10_000_000 },
        currency: { type: String, enum: ['LKR', 'USD'], required: true },
        provider: { type: String, enum: ['payhere', 'lemonsqueezy'], required: true },
        active: { type: Boolean, default: true, required: true },
        promotionActive: { type: Boolean, default: false },
        promotionLabel: { type: String, trim: true, maxlength: 80 },
        promotionDiscountType: { type: String, enum: ['fixed', 'percent'] },
        promotionDiscountValue: { type: Number, min: 1 },
      }],
      default: undefined,
    },
    active: { type: Boolean, default: true, required: true },
    promotionActive: { type: Boolean, default: false, required: true },
    promotionLabel: { type: String, trim: true, maxlength: 80 },
    promotionDiscountType: { type: String, enum: ['fixed', 'percent'] },
    promotionDiscountValue: { type: Number, min: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const BillingPlanSetting =
  (mongoose.models.BillingPlanSetting as mongoose.Model<IBillingPlanSetting>) ||
  mongoose.model<IBillingPlanSetting>('BillingPlanSetting', BillingPlanSettingSchema);

export default BillingPlanSetting;
