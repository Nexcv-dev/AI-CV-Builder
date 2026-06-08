import mongoose, { Document, Schema } from 'mongoose';

export interface IHtmlPdfGuestQuota extends Document {
  guestKey: string;
  day: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const HtmlPdfGuestQuotaSchema = new Schema(
  {
    guestKey: { type: String, required: true, trim: true, index: true },
    day: { type: String, required: true, index: true },
    count: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

HtmlPdfGuestQuotaSchema.index({ guestKey: 1, day: 1 }, { unique: true });

const HtmlPdfGuestQuota =
  (mongoose.models.HtmlPdfGuestQuota as mongoose.Model<IHtmlPdfGuestQuota>) ||
  mongoose.model<IHtmlPdfGuestQuota>('HtmlPdfGuestQuota', HtmlPdfGuestQuotaSchema);

export default HtmlPdfGuestQuota;
