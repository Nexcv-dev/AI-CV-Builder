import mongoose, { Document, Schema } from 'mongoose';

export interface ICVDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  template: string;
  cvData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CVDocumentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    template: { type: String, required: true },
    cvData: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
  }
);

const CVDocument =
  (mongoose.models.CVDocument as mongoose.Model<ICVDocument>) ||
  mongoose.model<ICVDocument>('CVDocument', CVDocumentSchema);

export default CVDocument;
