import mongoose, { Document, Schema } from 'mongoose';
import type { BillingPlan } from './userPlan';

export interface IBillingPlanSetting extends Document {
  plan: Exclude<BillingPlan, 'free'>;
  label: string;
  amountCents: number;
  currency: 'LKR';
  active: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BillingPlanSettingSchema = new Schema<IBillingPlanSetting>(
  {
    plan: { type: String, enum: ['payg', 'monthly'], required: true, unique: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    amountCents: { type: Number, required: true, min: 100, max: 10_000_000 },
    currency: { type: String, enum: ['LKR'], default: 'LKR', required: true },
    active: { type: Boolean, default: true, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const BillingPlanSetting =
  (mongoose.models.BillingPlanSetting as mongoose.Model<IBillingPlanSetting>) ||
  mongoose.model<IBillingPlanSetting>('BillingPlanSetting', BillingPlanSettingSchema);

export default BillingPlanSetting;
