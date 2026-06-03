import mongoose, { Document, Schema } from 'mongoose';
import { DEFAULT_USER_ROLE, UserRole } from './userRole';
import { ALL_USER_ROLES } from '../src/adminAccess';
import type { BillingPlan } from './userPlan';

export interface IUser extends Document {
  googleId?: string;
  githubId?: string;
  linkedinId?: string;
  email: string;
  displayName: string;
  role: UserRole;
  profileImage?: string;
  phone?: string;
  termsAcceptedAt?: Date;
  address?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  passwordHash?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  sessionVersion: number;
  authProvider: 'google' | 'github' | 'linkedin' | 'email';
  plan: BillingPlan;
  planStartedAt?: Date;
  planExpiresAt?: Date;
  paygCvSaveCredits: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    googleId: { type: String },
    githubId: { type: String },
    linkedinId: { type: String },
    email: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ALL_USER_ROLES, default: DEFAULT_USER_ROLE, required: true },
    profileImage: { type: String },
    phone: { type: String },
    termsAcceptedAt: { type: Date },
    address: { type: String },
    dob: { type: String },
    gender: { type: String },
    nationality: { type: String },
    passwordHash: { type: String },
    emailVerified: { type: Boolean, default: false, required: true },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    sessionVersion: { type: Number, default: 0, min: 0, required: true },
    authProvider: { type: String, enum: ['google', 'github', 'linkedin', 'email'], default: 'email', required: true },
    plan: { type: String, enum: ['free', 'payg', 'monthly', 'quarterly'], default: 'free', required: true },
    planStartedAt: { type: Date },
    planExpiresAt: { type: Date },
    paygCvSaveCredits: { type: Number, default: 0, min: 0, required: true },
  },
  {
    timestamps: true,
  }
);

UserSchema.index(
  { googleId: 1 },
  {
    name: 'googleId_1',
    unique: true,
    partialFilterExpression: { googleId: { $type: 'string' } },
  }
);
UserSchema.index(
  { githubId: 1 },
  {
    name: 'githubId_1',
    unique: true,
    partialFilterExpression: { githubId: { $type: 'string' } },
  }
);
UserSchema.index(
  { linkedinId: 1 },
  {
    name: 'linkedinId_1',
    unique: true,
    partialFilterExpression: { linkedinId: { $type: 'string' } },
  }
);
UserSchema.index({ createdAt: -1 });
UserSchema.index({ updatedAt: -1 });
UserSchema.index({ role: 1, createdAt: -1 });
UserSchema.index({ plan: 1, planExpiresAt: 1 });
UserSchema.index({ resetPasswordToken: 1, resetPasswordExpires: 1 });
UserSchema.index({ emailVerificationToken: 1, emailVerificationExpires: 1 });

const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
export default User;
