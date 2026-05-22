import mongoose, { Document, Schema } from 'mongoose';

export type AdminAuditAction =
  | 'user.role.updated'
  | 'user.plan.updated'
  | 'billing.plan.updated'
  | 'billing.coupon.saved'
  | 'billing.coupon.updated'
  | 'template.created'
  | 'template.updated'
  | 'template.published'
  | 'template.archived'
  | 'support.ticket.updated'
  | 'settings.updated';

export interface IAdminAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  action: AdminAuditAction;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  metadata: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true, trim: true, maxlength: 80, index: true },
    targetId: { type: String, trim: true, maxlength: 160, index: true },
    targetLabel: { type: String, trim: true, maxlength: 180 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, trim: true, maxlength: 80 },
    userAgent: { type: String, trim: true, maxlength: 260 },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ createdAt: -1 });
AdminAuditLogSchema.index({ targetType: 1, createdAt: -1 });

const AdminAuditLog =
  (mongoose.models.AdminAuditLog as mongoose.Model<IAdminAuditLog>) ||
  mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);

export default AdminAuditLog;

export function adminAuditLogSummary(log: any) {
  const actor = log.actorId && typeof log.actorId === 'object'
    ? {
        id: log.actorId._id?.toString?.() || log.actorId.id,
        email: log.actorId.email || '',
        displayName: log.actorId.displayName || '',
      }
    : null;

  return {
    id: log._id?.toString?.() || log.id,
    actor,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId || '',
    targetLabel: log.targetLabel || '',
    metadata: log.metadata || {},
    ip: log.ip || '',
    userAgent: log.userAgent || '',
    createdAt: log.createdAt,
  };
}

export async function recordAdminAuditLog(input: {
  actorId?: unknown;
  action: AdminAuditAction;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await AdminAuditLog.create({
      actorId: input.actorId as any,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      metadata: input.metadata || {},
      ip: input.ip,
      userAgent: input.userAgent,
    });
  } catch (error) {
    console.error('Could not record admin audit log:', error);
  }
}
