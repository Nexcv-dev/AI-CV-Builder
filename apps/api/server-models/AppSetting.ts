import mongoose, { Document, Schema } from 'mongoose';
import { DEFAULT_CMS_CONTENT, mergeCmsContent, type CmsContent } from '@nexcv/shared/contentDefaults';
import { DEFAULT_EMAIL_TEMPLATES, mergeEmailTemplates, type EmailTemplateMap } from '@nexcv/shared/emailTemplateDefaults';

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
  cmsContent: CmsContent;
  emailTemplates: EmailTemplateMap;
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
  cmsContent: DEFAULT_CMS_CONTENT,
  emailTemplates: DEFAULT_EMAIL_TEMPLATES,
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
    cmsContent: { type: Schema.Types.Mixed, default: DEFAULT_APP_SETTINGS.cmsContent },
    emailTemplates: { type: Schema.Types.Mixed, default: DEFAULT_APP_SETTINGS.emailTemplates },
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
  if (!setting.cmsContent) {
    setting.cmsContent = DEFAULT_CMS_CONTENT;
    await setting.save();
  } else {
    setting.cmsContent = mergeCmsContent(setting.cmsContent);
  }
  if (!setting.emailTemplates) {
    setting.emailTemplates = DEFAULT_EMAIL_TEMPLATES;
    await setting.save();
  } else {
    setting.emailTemplates = mergeEmailTemplates(setting.emailTemplates);
  }
  return setting;
}
