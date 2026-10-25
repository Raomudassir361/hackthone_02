import mongoose, { Schema, Document } from 'mongoose';
import { RuleSnapshot } from './status.js';

export type AttendanceSource = 'web' | 'camera' | 'correction';
export type AttendanceRecordStatus =
  | 'present'
  | 'late'
  | 'half_day'
  | 'missing_checkout'
  | 'on_leave';

export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD (company timezone)
  checkInAt: Date;
  checkOutAt?: Date;
  status: AttendanceRecordStatus;
  workedMinutes?: number;
  source: AttendanceSource;
  isWorkingDay: boolean;
  ruleSnapshot: RuleSnapshot;
  location?: {
    lat: number;
    lng: number;
    distanceMeters?: number;
  };
  correctionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date },
    status: {
      type: String,
      enum: ['present', 'late', 'half_day', 'missing_checkout', 'on_leave'],
      required: true,
    },
    workedMinutes: { type: Number, default: 0 },
    source: { type: String, enum: ['web', 'camera', 'correction'], default: 'web' },
    isWorkingDay: { type: Boolean, default: true },
    ruleSnapshot: {
      officeStart: { type: String, required: true },
      graceMinutes: { type: Number, required: true },
      halfDayHours: { type: Number, required: true },
    },
    location: {
      lat: Number,
      lng: Number,
      distanceMeters: Number,
    },
    correctionId: { type: Schema.Types.ObjectId, ref: 'AttendanceCorrection' },
  },
  {
    timestamps: true,
  }
);

// CRITICAL RULE: One record per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ employeeId: 1 });

export const AttendanceModel = mongoose.model<IAttendance>(
  'Attendance',
  attendanceSchema,
  'attendance'
);

// Attendance Corrections
export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface IAttendanceCorrection extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  reason: string;
  status: CorrectionStatus;
  decidedBy?: mongoose.Types.ObjectId;
  decisionComment?: string;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const correctionSchema = new Schema<IAttendanceCorrection>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true },
    requestedCheckIn: { type: Date },
    requestedCheckOut: { type: Date },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decisionComment: { type: String, trim: true },
    decidedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

correctionSchema.index({ employeeId: 1, status: 1 });
correctionSchema.index({ status: 1 });

export const AttendanceCorrectionModel = mongoose.model<IAttendanceCorrection>(
  'AttendanceCorrection',
  correctionSchema,
  'attendance_corrections'
);
