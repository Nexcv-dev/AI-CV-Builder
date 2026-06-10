import mongoose, { Document, Schema } from 'mongoose';

export interface ICvCreationQuota extends Document {
  userId: mongoose.Types.ObjectId;
  day: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const CvCreationQuotaSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    day: { type: String, required: true, index: true },
    count: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

CvCreationQuotaSchema.index({ userId: 1, day: 1 }, { unique: true });

const CvCreationQuota =
  (mongoose.models.CvCreationQuota as mongoose.Model<ICvCreationQuota>) ||
  mongoose.model<ICvCreationQuota>('CvCreationQuota', CvCreationQuotaSchema);

export default CvCreationQuota;
