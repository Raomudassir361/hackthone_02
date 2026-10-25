import mongoose, { Schema, Document } from 'mongoose';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveSource = 'form' | 'ai';

export interface ILeaveRequest extends Document {
  employeeId: mongoose.Types.ObjectId;
  leaveTypeKey: string; // 'annual' | 'sick' | 'casual' | 'unpaid'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  workingDays: number;
  reason: string;
  status: LeaveStatus;
  decidedBy?: mongoose.Types.ObjectId;
  decisionComment?: string;
  decidedAt?: Date;
  source: LeaveSource;
  createdAt: Date;
  updatedAt: Date;
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveTypeKey: { type: String, required: true, lowercase: true, trim: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    workingDays: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decisionComment: { type: String, trim: true },
    decidedAt: { type: Date },
    source: { type: String, enum: ['form', 'ai'], default: 'form' },
  },
  {
    timestamps: true,
  }
);

leaveRequestSchema.index({ employeeId: 1, startDate: 1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ employeeId: 1, status: 1 });

export const LeaveRequestModel = mongoose.model<ILeaveRequest>(
  'LeaveRequest',
  leaveRequestSchema,
  'leave_requests'
);
