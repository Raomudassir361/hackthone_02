import mongoose, { Schema, Document } from 'mongoose';

export type EmployeeStatus = 'probation' | 'active' | 'exited' | 'inactive';

export interface IEmployee extends Document {
  code: string; // e.g. EMP-0001
  name: string;
  email: string;
  phone?: string;
  address?: string;
  gender?: 'male' | 'female' | 'other';
  departmentId?: mongoose.Types.ObjectId;
  designationId?: mongoose.Types.ObjectId;
  joinDate: string; // ISO YYYY-MM-DD
  exitDate?: string;
  status: EmployeeStatus;
  basicSalary: number;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    designationId: { type: Schema.Types.ObjectId, ref: 'Designation' },
    joinDate: { type: String, required: true },
    exitDate: { type: String },
    status: { type: String, enum: ['probation', 'active', 'exited', 'inactive'], default: 'active' },
    basicSalary: { type: Number, required: true, min: 0 },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ name: 'text', email: 'text', code: 'text' });

export const EmployeeModel = mongoose.model<IEmployee>('Employee', employeeSchema, 'employees');

// Counters for EMP-0001
export interface ICounter extends Document {
  key: string;
  seq: number;
}

export const CounterModel = mongoose.model<ICounter>(
  'Counter',
  new Schema({
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  }),
  'counters'
);

export async function getNextSequence(key: string): Promise<number> {
  const counter = await CounterModel.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}
