import mongoose, { Document, Schema } from 'mongoose';

export type CvImportJobStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'expired';

export interface ICvImportJob extends Document {
  userId: mongoose.Types.ObjectId;
  status: CvImportJobStatus;
  base64Data?: string;
  mimeType: string;
  result?: Record<string, any>;
  error?: string;
  attempts: number;
  quotaReserved: boolean;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CvImportJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'ready', 'failed', 'expired'],
      default: 'queued',
      index: true,
    },
    base64Data: { type: String },
    mimeType: { type: String, required: true, trim: true },
    result: { type: Schema.Types.Mixed },
    error: { type: String, trim: true, maxlength: 500 },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    quotaReserved: { type: Boolean, required: true, default: false },
    startedAt: { type: Date },
    completedAt: { type: Date },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

CvImportJobSchema.index({ userId: 1, createdAt: -1 });
CvImportJobSchema.index({ status: 1, createdAt: 1 });

const CvImportJob =
  (mongoose.models.CvImportJob as mongoose.Model<ICvImportJob>) ||
  mongoose.model<ICvImportJob>('CvImportJob', CvImportJobSchema);

export default CvImportJob;
