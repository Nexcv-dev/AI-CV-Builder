import mongoose, { Document, Schema } from 'mongoose';
import { DEFAULT_USER_ROLE, UserRole } from './userRole';

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
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  authProvider: 'google' | 'email';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    googleId: { type: String },
    email: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ['user', 'super_admin'], default: DEFAULT_USER_ROLE, required: true },
    profileImage: { type: String },
    phone: { type: String },
    address: { type: String },
    dob: { type: String },
    gender: { type: String },
    nationality: { type: String },
    passwordHash: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    authProvider: { type: String, enum: ['google', 'email'], default: 'email', required: true },
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
