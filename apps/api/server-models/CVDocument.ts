import mongoose, { Document, Schema } from 'mongoose';

export interface ICVDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  template: string;
  cvData: Record<string, any>;
  status: 'draft' | 'completed';
  shareEnabled: boolean;
  shareSlug?: string | null;
  shareCreatedAt?: Date | null;
  shareUpdatedAt?: Date | null;
  shareRevokedAt?: Date | null;
  shareViewCount: number;
  shareDownloadCount: number;
  shareLastViewedAt?: Date | null;
  shareLastDownloadedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CVDocumentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    template: { type: String, required: true },
    cvData: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['draft', 'completed'], default: 'draft' },
    shareEnabled: { type: Boolean, default: false, index: true },
    shareSlug: { type: String, trim: true, default: null },
    shareCreatedAt: { type: Date, default: null },
    shareUpdatedAt: { type: Date, default: null },
    shareRevokedAt: { type: Date, default: null },
    shareViewCount: { type: Number, default: 0, min: 0 },
    shareDownloadCount: { type: Number, default: 0, min: 0 },
    shareLastViewedAt: { type: Date, default: null },
    shareLastDownloadedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

CVDocumentSchema.index({ userId: 1, updatedAt: -1 });
CVDocumentSchema.index({ shareSlug: 1 }, { unique: true, sparse: true });
CVDocumentSchema.index({ shareEnabled: 1, shareSlug: 1 });
CVDocumentSchema.index({ template: 1 });
CVDocumentSchema.index({ createdAt: -1 });
CVDocumentSchema.index({ updatedAt: -1 });

const CVDocument =
  (mongoose.models.CVDocument as mongoose.Model<ICVDocument>) ||
  mongoose.model<ICVDocument>('CVDocument', CVDocumentSchema);

export default CVDocument;
