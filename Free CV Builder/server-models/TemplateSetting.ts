import mongoose, { Document, Schema } from 'mongoose';

export type TemplateCategory = 'Modern' | 'ATS Friendly' | 'Minimal' | 'Executive' | 'Creative' | 'Tech' | 'Corporate';

export interface ITemplateSetting extends Document {
  key: string;
  label?: string;
  category: TemplateCategory;
  access: 'free' | 'paid';
  thumbnail?: string;
  surfaceColorRole: 'none' | 'sidebar' | 'header';
  surfaceColorLabel?: string;
  source: 'built_in' | 'custom';
  status: 'draft' | 'active' | 'archived';
  s3Prefix?: string;
  indexS3Key?: string;
  styleS3Key?: string;
  thumbnailS3Key?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSettingSchema = new Schema<ITemplateSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, trim: true, maxlength: 80 },
    category: {
      type: String,
      enum: ['Modern', 'ATS Friendly', 'Minimal', 'Executive', 'Creative', 'Tech', 'Corporate'],
      default: 'Modern',
      required: true,
    },
    access: { type: String, enum: ['free', 'paid'], default: 'paid', required: true },
    thumbnail: { type: String, trim: true, maxlength: 500 },
    surfaceColorRole: { type: String, enum: ['none', 'sidebar', 'header'], default: 'none', required: true },
    surfaceColorLabel: { type: String, trim: true, maxlength: 80 },
    source: { type: String, enum: ['built_in', 'custom'], default: 'built_in', required: true, index: true },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active', required: true, index: true },
    s3Prefix: { type: String, trim: true, maxlength: 160 },
    indexS3Key: { type: String, trim: true, maxlength: 260 },
    styleS3Key: { type: String, trim: true, maxlength: 260 },
    thumbnailS3Key: { type: String, trim: true, maxlength: 260 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

const TemplateSetting =
  (mongoose.models.TemplateSetting as mongoose.Model<ITemplateSetting>) ||
  mongoose.model<ITemplateSetting>('TemplateSetting', TemplateSettingSchema);

export default TemplateSetting;
