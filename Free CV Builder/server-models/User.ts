import mongoose, { Document, Schema } from 'mongoose';
import { DEFAULT_USER_ROLE, UserRole } from './userRole';
import { ALL_USER_ROLES } from '../src/adminAccess';
import type { BillingPlan } from './userPlan';

export interface IUser extends Document {
  googleId?: string;
  email: string;
  displayName: string;
  role: UserRole;
  profileImage?: string;
  phone?: string;
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
  authProvider: 'google' | 'email';
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
    email: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ALL_USER_ROLES, default: DEFAULT_USER_ROLE, required: true },
    profileImage: { type: String },
    phone: { type: String },
    address: { type: String },
    dob: { type: String },
    gender: { type: String },
    nationality: { type: String },
    passwordHash: { type: String },
    emailVerified: { type: Boolean, default: true, required: true },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    authProvider: { type: String, enum: ['google', 'email'], default: 'email', required: true },
    plan: { type: String, enum: ['free', 'payg', 'monthly'], default: 'free', required: true },
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

const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
export default User;
