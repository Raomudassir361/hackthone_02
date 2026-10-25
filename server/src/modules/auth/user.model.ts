import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'admin' | 'hr' | 'employee';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: UserRole;
  employeeId?: mongoose.Types.ObjectId;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'hr', 'employee'],
      required: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<IUser>('User', userSchema, 'users');
