import mongoose, { Document, Schema } from 'mongoose';

export interface IDownloadQuota extends Document {
  userId: mongoose.Types.ObjectId;
  day: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const DownloadQuotaSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    day: { type: String, required: true, index: true },
    count: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

DownloadQuotaSchema.index({ userId: 1, day: 1 }, { unique: true });

const DownloadQuota =
  (mongoose.models.DownloadQuota as mongoose.Model<IDownloadQuota>) ||
  mongoose.model<IDownloadQuota>('DownloadQuota', DownloadQuotaSchema);

export default DownloadQuota;
