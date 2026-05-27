import mongoose, { Document, Schema } from 'mongoose';

export interface IRateLimitCounter extends Document {
  key: string;
  hits: number;
  resetTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RateLimitCounterSchema = new Schema<IRateLimitCounter>(
  {
    key: { type: String, required: true, unique: true, index: true },
    hits: { type: Number, required: true, default: 0, min: 0 },
    resetTime: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

RateLimitCounterSchema.index({ resetTime: 1 }, { expireAfterSeconds: 60 * 60 });

const RateLimitCounter =
  (mongoose.models.RateLimitCounter as mongoose.Model<IRateLimitCounter>) ||
  mongoose.model<IRateLimitCounter>('RateLimitCounter', RateLimitCounterSchema);

export default RateLimitCounter;
