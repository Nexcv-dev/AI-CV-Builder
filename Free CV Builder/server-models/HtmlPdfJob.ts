import mongoose, { Document, Schema } from 'mongoose';

export type HtmlPdfJobStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'expired';
export type HtmlPdfPageSize = 'A4' | 'Letter';

export interface IHtmlPdfJob extends Document {
  userId?: mongoose.Types.ObjectId;
  guestKey?: string;
  status: HtmlPdfJobStatus;
  html: string;
  css: string;
  filename: string;
  pageSize: HtmlPdfPageSize;
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

const HtmlPdfJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    guestKey: { type: String, trim: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'ready', 'failed', 'expired'],
      default: 'queued',
      index: true,
    },
    html: { type: String, required: true, maxlength: 260000 },
    css: { type: String, default: '', maxlength: 260000 },
    filename: { type: String, required: true, trim: true, maxlength: 120 },
    pageSize: { type: String, enum: ['A4', 'Letter'], default: 'A4' },
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

HtmlPdfJobSchema.index({ userId: 1, createdAt: -1 });
HtmlPdfJobSchema.index({ guestKey: 1, createdAt: -1 }, { partialFilterExpression: { guestKey: { $exists: true } } });
HtmlPdfJobSchema.index({ status: 1, createdAt: 1 });

const HtmlPdfJob =
  (mongoose.models.HtmlPdfJob as mongoose.Model<IHtmlPdfJob>) ||
  mongoose.model<IHtmlPdfJob>('HtmlPdfJob', HtmlPdfJobSchema);

export default HtmlPdfJob;
