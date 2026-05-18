import mongoose, { Document, Schema } from 'mongoose';

export type TemplateCategory = 'Modern' | 'ATS Friendly' | 'Minimal' | 'Executive' | 'Creative' | 'Tech' | 'Corporate';

export interface ITemplateSetting extends Document {
  key: string;
  label?: string;
  category: TemplateCategory;
  access: 'free' | 'paid';
  thumbnail?: string;
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
  },
  {
    timestamps: true,
  }
);

const TemplateSetting =
  (mongoose.models.TemplateSetting as mongoose.Model<ITemplateSetting>) ||
  mongoose.model<ITemplateSetting>('TemplateSetting', TemplateSettingSchema);

export default TemplateSetting;
