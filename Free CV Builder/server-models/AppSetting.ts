import mongoose, { Document, Schema } from 'mongoose';

export interface IAppSetting extends Document {
  singletonKey: 'global';
  maintenanceMode: boolean;
  announcementEnabled: boolean;
  announcementText: string;
  supportEmail: string;
  emailVerificationRequired: boolean;
  payhereEnabled: boolean;
  payhereModeLabel: 'sandbox' | 'live';
  freeCvCreationLimit: number;
  freePdfDownloadLimit: number;
  defaultTemplateKey: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_APP_SETTINGS = {
  singletonKey: 'global' as const,
  maintenanceMode: false,
  announcementEnabled: false,
  announcementText: '',
  supportEmail: 'support@nexcv.com',
  emailVerificationRequired: true,
  payhereEnabled: true,
  payhereModeLabel: 'sandbox' as const,
  freeCvCreationLimit: 1,
  freePdfDownloadLimit: 1,
  defaultTemplateKey: 'professional',
};

const AppSettingSchema = new Schema<IAppSetting>(
  {
    singletonKey: { type: String, enum: ['global'], default: 'global', unique: true, index: true },
    maintenanceMode: { type: Boolean, default: DEFAULT_APP_SETTINGS.maintenanceMode },
    announcementEnabled: { type: Boolean, default: DEFAULT_APP_SETTINGS.announcementEnabled },
    announcementText: { type: String, trim: true, maxlength: 180, default: DEFAULT_APP_SETTINGS.announcementText },
    supportEmail: { type: String, trim: true, lowercase: true, maxlength: 120, default: DEFAULT_APP_SETTINGS.supportEmail },
    emailVerificationRequired: { type: Boolean, default: DEFAULT_APP_SETTINGS.emailVerificationRequired },
    payhereEnabled: { type: Boolean, default: DEFAULT_APP_SETTINGS.payhereEnabled },
    payhereModeLabel: { type: String, enum: ['sandbox', 'live'], default: DEFAULT_APP_SETTINGS.payhereModeLabel },
    freeCvCreationLimit: { type: Number, min: 0, max: 100, default: DEFAULT_APP_SETTINGS.freeCvCreationLimit },
    freePdfDownloadLimit: { type: Number, min: 0, max: 100, default: DEFAULT_APP_SETTINGS.freePdfDownloadLimit },
    defaultTemplateKey: { type: String, trim: true, maxlength: 80, default: DEFAULT_APP_SETTINGS.defaultTemplateKey },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const AppSetting =
  (mongoose.models.AppSetting as mongoose.Model<IAppSetting>) ||
  mongoose.model<IAppSetting>('AppSetting', AppSettingSchema);

export default AppSetting;

export async function getAppSettings() {
  if (mongoose.connection.readyState !== 1) {
    return new AppSetting(DEFAULT_APP_SETTINGS);
  }

  const setting = await AppSetting.findOneAndUpdate(
    { singletonKey: 'global' },
    { $setOnInsert: DEFAULT_APP_SETTINGS },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return setting;
}
