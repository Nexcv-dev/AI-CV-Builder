import mongoose, { Document, Schema } from 'mongoose';

export interface IHtmlPdfQuota extends Document {
  userId: mongoose.Types.ObjectId;
  day: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const HtmlPdfQuotaSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    day: { type: String, required: true, index: true },
    count: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

HtmlPdfQuotaSchema.index({ userId: 1, day: 1 }, { unique: true });

const HtmlPdfQuota =
  (mongoose.models.HtmlPdfQuota as mongoose.Model<IHtmlPdfQuota>) ||
  mongoose.model<IHtmlPdfQuota>('HtmlPdfQuota', HtmlPdfQuotaSchema);

export default HtmlPdfQuota;
