import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  companyName: string;
  timezone: string;
  officeStart: string; // "09:00"
  graceMinutes: number; // 15
  halfDayHours: number; // 5
  weekendDays: number[]; // [0, 6]
  officeLat: number;
  officeLng: number;
  officeRadiusM: number;
  hraPct: number; // 40
  medicalPct: number; // 10
  setupComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    companyName: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Karachi' },
    officeStart: { type: String, default: '09:00' },
    graceMinutes: { type: Number, default: 15 },
    halfDayHours: { type: Number, default: 5 },
    weekendDays: { type: [Number], default: [0, 6] },
    officeLat: { type: Number, default: 24.8607 },
    officeLng: { type: Number, default: 67.0011 },
    officeRadiusM: { type: Number, default: 150 },
    hraPct: { type: Number, default: 40 },
    medicalPct: { type: Number, default: 10 },
    setupComplete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const SettingsModel = mongoose.model<ISettings>('Settings', settingsSchema, 'settings');

// Organization entities
export interface IDepartment extends Document {
  name: string;
  code: string;
}

export const DepartmentModel = mongoose.model<IDepartment>(
  'Department',
  new Schema({
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, trim: true },
  }, { timestamps: true }),
  'departments'
);

export interface IDesignation extends Document {
  title: string;
}

export const DesignationModel = mongoose.model<IDesignation>(
  'Designation',
  new Schema({
    title: { type: String, required: true, unique: true, trim: true },
  }, { timestamps: true }),
  'designations'
);

export interface ILeaveType extends Document {
  key: string; // 'annual' | 'sick' | 'casual' | 'unpaid'
  name: string;
  yearlyQuota: number | null; // null = unlimited
  isPaid: boolean;
}

export const LeaveTypeModel = mongoose.model<ILeaveType>(
  'LeaveType',
  new Schema({
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    yearlyQuota: { type: Number, default: null },
    isPaid: { type: Boolean, default: true },
  }, { timestamps: true }),
  'leave_types'
);

export interface IHoliday extends Document {
  date: string; // 'YYYY-MM-DD'
  name: string;
}

export const HolidayModel = mongoose.model<IHoliday>(
  'Holiday',
  new Schema({
    date: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
  }, { timestamps: true }),
  'holidays'
);
