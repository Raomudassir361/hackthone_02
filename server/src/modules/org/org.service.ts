import { AppError } from '../../shared/errors.js';
import {
  SettingsModel,
  DepartmentModel,
  DesignationModel,
  LeaveTypeModel,
  HolidayModel,
} from './org.model.js';
import { AuditService } from '../audit/audit.service.js';
import { RequestContext } from '../../middleware/auth.js';

export class OrgService {
  // Settings
  public static async getSettings() {
    let settings = await SettingsModel.findOne();
    if (!settings) {
      settings = await SettingsModel.create({
        companyName: 'Default Company',
        timezone: 'Asia/Karachi',
        setupComplete: false,
      });
    }
    return settings;
  }

  public static async updateSettings(ctx: RequestContext, updateData: Record<string, unknown>, ip?: string) {
    const before = await this.getSettings();
    const updated = await SettingsModel.findByIdAndUpdate(
      before._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'UPDATE_SETTINGS',
      entity: 'settings',
      entityId: before._id.toString(),
      before: before.toObject(),
      after: updated?.toObject(),
      ip,
    });

    return updated;
  }

  // Departments
  public static async getDepartments() {
    return DepartmentModel.find().sort({ name: 1 });
  }

  public static async createDepartment(ctx: RequestContext, data: { name: string; code: string }, ip?: string) {
    const existing = await DepartmentModel.findOne({ name: data.name.trim() });
    if (existing) {
      throw new AppError('DUPLICATE_DEPARTMENT', 409, 'Department name already exists');
    }
    const dept = await DepartmentModel.create(data);
    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'CREATE_DEPARTMENT',
      entity: 'departments',
      entityId: dept._id.toString(),
      after: dept.toObject(),
      ip,
    });
    return dept;
  }

  public static async updateDepartment(ctx: RequestContext, id: string, data: { name: string; code: string }, ip?: string) {
    const before = await DepartmentModel.findById(id);
    if (!before) throw new AppError('NOT_FOUND', 404, 'Department not found');

    const updated = await DepartmentModel.findByIdAndUpdate(id, data, { new: true });
    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'UPDATE_DEPARTMENT',
      entity: 'departments',
      entityId: id,
      before: before.toObject(),
      after: updated?.toObject(),
      ip,
    });
    return updated;
  }

  public static async deleteDepartment(ctx: RequestContext, id: string, ip?: string) {
    const before = await DepartmentModel.findById(id);
    if (!before) throw new AppError('NOT_FOUND', 404, 'Department not found');

    await DepartmentModel.findByIdAndDelete(id);
    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'DELETE_DEPARTMENT',
      entity: 'departments',
      entityId: id,
      before: before.toObject(),
      ip,
    });
    return { message: 'Department deleted successfully' };
  }

  // Designations
  public static async getDesignations() {
    return DesignationModel.find().sort({ title: 1 });
  }

  public static async createDesignation(ctx: RequestContext, data: { title: string }, ip?: string) {
    const existing = await DesignationModel.findOne({ title: data.title.trim() });
    if (existing) {
      throw new AppError('DUPLICATE_DESIGNATION', 409, 'Designation title already exists');
    }
    const desig = await DesignationModel.create(data);
    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'CREATE_DESIGNATION',
      entity: 'designations',
      entityId: desig._id.toString(),
      after: desig.toObject(),
      ip,
    });
    return desig;
  }

  // Leave Types
  public static async getLeaveTypes() {
    return LeaveTypeModel.find().sort({ createdAt: 1 });
  }

  public static async createLeaveType(
    ctx: RequestContext,
    data: { key: string; name: string; yearlyQuota: number | null; isPaid: boolean },
    ip?: string
  ) {
    const existing = await LeaveTypeModel.findOne({ key: data.key.toLowerCase().trim() });
    if (existing) {
      throw new AppError('DUPLICATE_LEAVE_TYPE', 409, 'Leave type key already exists');
    }
    const lt = await LeaveTypeModel.create({
      ...data,
      key: data.key.toLowerCase().trim(),
    });
    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'CREATE_LEAVE_TYPE',
      entity: 'leave_types',
      entityId: lt._id.toString(),
      after: lt.toObject(),
      ip,
    });
    return lt;
  }

  // Holidays
  public static async getHolidays() {
    return HolidayModel.find().sort({ date: 1 });
  }

  public static async createHoliday(ctx: RequestContext, data: { date: string; name: string }, ip?: string) {
    const existing = await HolidayModel.findOne({ date: data.date });
    if (existing) {
      throw new AppError('DUPLICATE_HOLIDAY', 409, 'Holiday on this date already exists');
    }
    const hol = await HolidayModel.create(data);
    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'CREATE_HOLIDAY',
      entity: 'holidays',
      entityId: hol._id.toString(),
      after: hol.toObject(),
      ip,
    });
    return hol;
  }

  public static async deleteHoliday(ctx: RequestContext, id: string, ip?: string) {
    const before = await HolidayModel.findById(id);
    if (!before) throw new AppError('NOT_FOUND', 404, 'Holiday not found');

    await HolidayModel.findByIdAndDelete(id);
    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'DELETE_HOLIDAY',
      entity: 'holidays',
      entityId: id,
      before: before.toObject(),
      ip,
    });
    return { message: 'Holiday deleted' };
  }
}
