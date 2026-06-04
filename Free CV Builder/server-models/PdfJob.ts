import mongoose, { Document, Schema } from 'mongoose';

export type PdfJobStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'expired';

export interface IPdfJob extends Document {
  userId: mongoose.Types.ObjectId;
  status: PdfJobStatus;
  cvData: Record<string, any>;
  template: string;
  watermark: boolean;
  templateSource?: string;
  renderer?: string;
  outputBucket?: string;
  outputKey?: string;
  outputBytes?: number;
  error?: string;
  attempts: number;
  quotaReserved: boolean;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PdfJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'ready', 'failed', 'expired'],
      default: 'queued',
      index: true,
    },
    cvData: { type: Schema.Types.Mixed, required: true },
    template: { type: String, required: true },
    watermark: { type: Boolean, required: true, default: false },
    templateSource: { type: String, trim: true },
    renderer: { type: String, trim: true },
    outputBucket: { type: String, trim: true },
    outputKey: { type: String, trim: true },
    outputBytes: { type: Number, min: 0 },
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

PdfJobSchema.index({ userId: 1, createdAt: -1 });
PdfJobSchema.index({ status: 1, createdAt: 1 });

const PdfJob =
  (mongoose.models.PdfJob as mongoose.Model<IPdfJob>) ||
  mongoose.model<IPdfJob>('PdfJob', PdfJobSchema);

export default PdfJob;
