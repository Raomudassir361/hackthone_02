import mongoose, { Schema, Document } from 'mongoose';

export interface IAiLog extends Document {
  userId: mongoose.Types.ObjectId;
  role: 'admin' | 'hr' | 'employee';
  kind: 'chat' | 'summary' | 'smart_leave';
  prompt: string;
  toolCalls?: Array<{
    name: string;
    args: unknown;
    result: unknown;
  }>;
  response: string;
  latencyMs: number;
  status: 'success' | 'error' | 'fallback';
  createdAt: Date;
}

const AiLogSchema = new Schema<IAiLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['admin', 'hr', 'employee'], required: true },
    kind: { type: String, enum: ['chat', 'summary', 'smart_leave'], required: true },
    prompt: { type: String, required: true },
    toolCalls: [
      {
        name: { type: String },
        args: { type: Schema.Types.Mixed },
        result: { type: Schema.Types.Mixed },
      },
    ],
    response: { type: String, required: true },
    latencyMs: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['success', 'error', 'fallback'], default: 'success' },
  },
  { timestamps: true }
);

AiLogSchema.index({ userId: 1, createdAt: -1 });

export const AiLogModel = mongoose.model<IAiLog>('AiLog', AiLogSchema, 'ai_logs');
