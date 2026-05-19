import mongoose, { Document, Schema } from 'mongoose';

export type SupportTicketType = 'complaint' | 'bug' | 'feature_request' | 'payment_issue' | 'general';
export type SupportTicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ISupportTicket extends Document {
  userId?: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  type: SupportTicketType;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    type: { type: String, enum: ['complaint', 'bug', 'feature_request', 'payment_issue', 'general'], default: 'general', required: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: ['open', 'pending', 'resolved', 'closed'], default: 'open', required: true, index: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal', required: true, index: true },
    adminNotes: { type: String, trim: true, maxlength: 2000 },
  },
  {
    timestamps: true,
  }
);

SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ email: 1, createdAt: -1 });

const SupportTicket =
  (mongoose.models.SupportTicket as mongoose.Model<ISupportTicket>) ||
  mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);

export default SupportTicket;
