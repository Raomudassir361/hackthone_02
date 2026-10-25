"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgService = void 0;
const errors_js_1 = require("../../shared/errors.js");
const org_model_js_1 = require("./org.model.js");
const audit_service_js_1 = require("../audit/audit.service.js");
class OrgService {
    // Settings
    static async getSettings() {
        let settings = await org_model_js_1.SettingsModel.findOne();
        if (!settings) {
            settings = await org_model_js_1.SettingsModel.create({
                companyName: 'Default Company',
                timezone: 'Asia/Karachi',
                setupComplete: false,
            });
        }
        return settings;
    }
    static async updateSettings(ctx, updateData, ip) {
        const before = await this.getSettings();
        const updated = await org_model_js_1.SettingsModel.findByIdAndUpdate(before._id, { $set: updateData }, { new: true, runValidators: true });
        await audit_service_js_1.AuditService.log({
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
    static async getDepartments() {
        return org_model_js_1.DepartmentModel.find().sort({ name: 1 });
    }
    static async createDepartment(ctx, data, ip) {
        const existing = await org_model_js_1.DepartmentModel.findOne({ name: data.name.trim() });
        if (existing) {
            throw new errors_js_1.AppError('DUPLICATE_DEPARTMENT', 409, 'Department name already exists');
        }
        const dept = await org_model_js_1.DepartmentModel.create(data);
        await audit_service_js_1.AuditService.log({
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
    static async updateDepartment(ctx, id, data, ip) {
        const before = await org_model_js_1.DepartmentModel.findById(id);
        if (!before)
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Department not found');
        const updated = await org_model_js_1.DepartmentModel.findByIdAndUpdate(id, data, { new: true });
        await audit_service_js_1.AuditService.log({
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
    static async deleteDepartment(ctx, id, ip) {
        const before = await org_model_js_1.DepartmentModel.findById(id);
        if (!before)
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Department not found');
        await org_model_js_1.DepartmentModel.findByIdAndDelete(id);
        await audit_service_js_1.AuditService.log({
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
    static async getDesignations() {
        return org_model_js_1.DesignationModel.find().sort({ title: 1 });
    }
    static async createDesignation(ctx, data, ip) {
        const existing = await org_model_js_1.DesignationModel.findOne({ title: data.title.trim() });
        if (existing) {
            throw new errors_js_1.AppError('DUPLICATE_DESIGNATION', 409, 'Designation title already exists');
        }
        const desig = await org_model_js_1.DesignationModel.create(data);
        await audit_service_js_1.AuditService.log({
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
    static async getLeaveTypes() {
        return org_model_js_1.LeaveTypeModel.find().sort({ createdAt: 1 });
    }
    static async createLeaveType(ctx, data, ip) {
        const existing = await org_model_js_1.LeaveTypeModel.findOne({ key: data.key.toLowerCase().trim() });
        if (existing) {
            throw new errors_js_1.AppError('DUPLICATE_LEAVE_TYPE', 409, 'Leave type key already exists');
        }
        const lt = await org_model_js_1.LeaveTypeModel.create({
            ...data,
            key: data.key.toLowerCase().trim(),
        });
        await audit_service_js_1.AuditService.log({
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
    static async getHolidays() {
        return org_model_js_1.HolidayModel.find().sort({ date: 1 });
    }
    static async createHoliday(ctx, data, ip) {
        const existing = await org_model_js_1.HolidayModel.findOne({ date: data.date });
        if (existing) {
            throw new errors_js_1.AppError('DUPLICATE_HOLIDAY', 409, 'Holiday on this date already exists');
        }
        const hol = await org_model_js_1.HolidayModel.create(data);
        await audit_service_js_1.AuditService.log({
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
    static async deleteHoliday(ctx, id, ip) {
        const before = await org_model_js_1.HolidayModel.findById(id);
        if (!before)
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Holiday not found');
        await org_model_js_1.HolidayModel.findByIdAndDelete(id);
        await audit_service_js_1.AuditService.log({
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
exports.OrgService = OrgService;
