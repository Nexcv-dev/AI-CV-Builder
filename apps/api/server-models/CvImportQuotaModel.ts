import mongoose, { Document, Schema } from 'mongoose';

export interface ICvImportQuota extends Document {
  userId: mongoose.Types.ObjectId;
  period: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const CvImportQuotaSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    period: { type: String, required: true, index: true },
    count: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

CvImportQuotaSchema.index({ userId: 1, period: 1 }, { unique: true });

const CvImportQuota =
  (mongoose.models.CvImportQuota as mongoose.Model<ICvImportQuota>) ||
  mongoose.model<ICvImportQuota>('CvImportQuota', CvImportQuotaSchema);

export default CvImportQuota;
