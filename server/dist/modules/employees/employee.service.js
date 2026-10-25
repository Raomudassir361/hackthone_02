"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_js_1 = require("../../config/env.js");
const errors_js_1 = require("../../shared/errors.js");
const employee_model_js_1 = require("./employee.model.js");
const user_model_js_1 = require("../auth/user.model.js");
const org_model_js_1 = require("../org/org.model.js");
const audit_service_js_1 = require("../audit/audit.service.js");
const pagination_js_1 = require("../../shared/pagination.js");
const csvImport_service_js_1 = require("./csvImport.service.js");
class EmployeeService {
    /**
     * Create single employee and linked user login with temporary password (F06)
     */
    static async createEmployee(ctx, input, ip) {
        const existingUser = await user_model_js_1.UserModel.findOne({ email: input.email.toLowerCase() });
        if (existingUser) {
            throw new errors_js_1.AppError('USER_EXISTS', 409, 'An account with this email already exists');
        }
        const existingEmp = await employee_model_js_1.EmployeeModel.findOne({ email: input.email.toLowerCase() });
        if (existingEmp) {
            throw new errors_js_1.AppError('EMPLOYEE_EXISTS', 409, 'An employee with this email already exists');
        }
        // Verify department and designation exist
        const department = await org_model_js_1.DepartmentModel.findById(input.departmentId);
        if (!department) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Specified Department not found');
        }
        const designation = await org_model_js_1.DesignationModel.findById(input.designationId);
        if (!designation) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Specified Designation not found');
        }
        // Generate code EMP-0001
        const seq = await (0, employee_model_js_1.getNextSequence)('employee_code');
        const code = `EMP-${String(seq).padStart(4, '0')}`;
        // Generate temporary password
        const tempPassword = `Pass-${crypto_1.default.randomBytes(4).toString('hex')}!`;
        const passwordHash = await bcrypt_1.default.hash(tempPassword, env_js_1.env.BCRYPT_ROUNDS);
        // Create User record
        const user = await user_model_js_1.UserModel.create({
            email: input.email.toLowerCase(),
            passwordHash,
            role: 'employee',
            isActive: true,
            mustChangePassword: true,
        });
        // Create Employee record
        const employee = await employee_model_js_1.EmployeeModel.create({
            code,
            name: input.name,
            email: input.email.toLowerCase(),
            phone: input.phone,
            address: input.address,
            gender: input.gender,
            departmentId: department._id,
            designationId: designation._id,
            joinDate: input.joinDate,
            status: input.status,
            basicSalary: input.basicSalary,
            userId: user._id,
        });
        user.employeeId = employee._id;
        await user.save();
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'CREATE_EMPLOYEE',
            entity: 'employees',
            entityId: employee._id.toString(),
            after: { code: employee.code, email: employee.email, name: employee.name },
            ip,
        });
        return {
            employee: {
                id: employee._id.toString(),
                code: employee.code,
                name: employee.name,
                email: employee.email,
                department: { id: department._id.toString(), name: department.name },
                designation: { id: designation._id.toString(), title: designation.title },
                joinDate: employee.joinDate,
                status: employee.status,
            },
            temporaryPassword: tempPassword, // returned once to handover
        };
    }
    /**
     * Update employee details (HR only, F06)
     */
    static async updateEmployee(ctx, id, input, ip) {
        const before = await employee_model_js_1.EmployeeModel.findById(id);
        if (!before) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Employee not found');
        }
        if (input.email && input.email.toLowerCase() !== before.email) {
            const emailTaken = await employee_model_js_1.EmployeeModel.findOne({ email: input.email.toLowerCase() });
            if (emailTaken) {
                throw new errors_js_1.AppError('DUPLICATE_EMAIL', 409, 'Email is already used by another employee');
            }
            // Also update linked user email
            if (before.userId) {
                await user_model_js_1.UserModel.findByIdAndUpdate(before.userId, { email: input.email.toLowerCase() });
            }
        }
        const updated = await employee_model_js_1.EmployeeModel.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'UPDATE_EMPLOYEE',
            entity: 'employees',
            entityId: id,
            before: before.toObject(),
            after: updated?.toObject(),
            ip,
        });
        return updated;
    }
    /**
     * Get paginated employees list with server-side search and filters (F07)
     */
    static async getEmployees(ctx, query) {
        const filter = {};
        // Data-scope rule: If role is employee, force own employeeId
        if (ctx.role === 'employee') {
            if (!ctx.employeeId) {
                return (0, pagination_js_1.buildPaginationResponse)([], 0, query.page, query.limit);
            }
            filter._id = new mongoose_1.default.Types.ObjectId(ctx.employeeId);
        }
        else {
            if (query.departmentId) {
                filter.departmentId = new mongoose_1.default.Types.ObjectId(query.departmentId);
            }
            if (query.designationId) {
                filter.designationId = new mongoose_1.default.Types.ObjectId(query.designationId);
            }
            if (query.status) {
                filter.status = query.status;
            }
            if (query.search) {
                const regex = new RegExp(query.search.trim(), 'i');
                filter.$or = [{ name: regex }, { email: regex }, { code: regex }];
            }
        }
        const skip = (query.page - 1) * query.limit;
        const [total, rows] = await Promise.all([
            employee_model_js_1.EmployeeModel.countDocuments(filter),
            employee_model_js_1.EmployeeModel.find(filter)
                .populate('departmentId', 'name code')
                .populate('designationId', 'title')
                .sort({ code: 1 })
                .skip(skip)
                .limit(query.limit)
                .lean(),
        ]);
        // Data-scope rule: do not leak basicSalary to other non-admin/HR roles
        const sanitized = rows.map((emp) => {
            if (ctx.role === 'employee' && emp._id.toString() !== ctx.employeeId) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { basicSalary, ...safe } = emp;
                return safe;
            }
            return emp;
        });
        return (0, pagination_js_1.buildPaginationResponse)(sanitized, total, query.page, query.limit);
    }
    /**
     * Get single employee 360 overview (F07)
     * If an Employee role attempts to access someone else's ID, return 404 per rules.md
     */
    static async getEmployeeById(ctx, id) {
        if (ctx.role === 'employee' && ctx.employeeId !== id) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Employee record not found');
        }
        const employee = await employee_model_js_1.EmployeeModel.findById(id)
            .populate('departmentId', 'name code')
            .populate('designationId', 'title')
            .lean();
        if (!employee) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Employee record not found');
        }
        return employee;
    }
    /**
     * Employee self-service edit (phone and address only, F06)
     */
    static async updateOwnProfile(ctx, input, ip) {
        if (!ctx.employeeId) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'No linked employee profile found for user');
        }
        const before = await employee_model_js_1.EmployeeModel.findById(ctx.employeeId);
        if (!before) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Employee record not found');
        }
        const updateFields = {};
        if (input.phone !== undefined)
            updateFields.phone = input.phone;
        if (input.address !== undefined)
            updateFields.address = input.address;
        const updated = await employee_model_js_1.EmployeeModel.findByIdAndUpdate(ctx.employeeId, { $set: updateFields }, { new: true });
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'UPDATE_OWN_PROFILE',
            entity: 'employees',
            entityId: ctx.employeeId,
            before: { phone: before.phone, address: before.address },
            after: updateFields,
            ip,
        });
        return updated;
    }
    /**
     * Salary Structure: GET and PUT /employees/:id/salary (F14)
     * HR write, Admin view; nobody edits own salary.
     */
    static async getSalary(ctx, employeeId) {
        if (ctx.role === 'employee') {
            if (ctx.employeeId !== employeeId) {
                throw new errors_js_1.AppError('NOT_FOUND', 404, 'Record not found');
            }
        }
        const employee = await employee_model_js_1.EmployeeModel.findById(employeeId).select('name code basicSalary');
        if (!employee) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Employee not found');
        }
        const basic = employee.basicSalary;
        const hra = basic * 0.4;
        const medical = basic * 0.1;
        const gross = basic * 1.5;
        return {
            employeeId: employee._id.toString(),
            name: employee.name,
            code: employee.code,
            basic,
            hra,
            medical,
            gross,
        };
    }
    static async updateSalary(ctx, employeeId, input, ip) {
        // Rule: Nobody edits own salary!
        if (ctx.employeeId === employeeId) {
            throw new errors_js_1.AppError('FORBIDDEN', 403, 'You cannot edit your own salary structure');
        }
        const before = await employee_model_js_1.EmployeeModel.findById(employeeId);
        if (!before) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Employee not found');
        }
        before.basicSalary = input.basicSalary;
        await before.save();
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'UPDATE_SALARY',
            entity: 'employees',
            entityId: employeeId,
            before: { basicSalary: before.basicSalary },
            after: { basicSalary: input.basicSalary },
            ip,
        });
        const basic = before.basicSalary;
        return {
            employeeId: before._id.toString(),
            basic,
            hra: basic * 0.4,
            medical: basic * 0.1,
            gross: basic * 1.5,
        };
    }
    /**
     * CSV Import with dry-run support (F08)
     */
    static async importCsv(ctx, csvContent, dryRun, ip) {
        const parseResult = csvImport_service_js_1.CsvImportParser.parse(csvContent);
        const errors = [...parseResult.errors];
        const validRows = parseResult.validRows;
        // Resolve departments and designations
        const allDepts = await org_model_js_1.DepartmentModel.find();
        const allDesigs = await org_model_js_1.DesignationModel.find();
        const deptMap = new Map();
        allDepts.forEach((d) => {
            deptMap.set(d.name.toLowerCase(), d._id);
            deptMap.set(d.code.toLowerCase(), d._id);
        });
        const desigMap = new Map();
        allDesigs.forEach((d) => {
            desigMap.set(d.title.toLowerCase(), d._id);
        });
        // Check DB conflicts for valid rows
        const rowsToInsert = [];
        for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            const rowNum = i + 2; // header is row 1
            const deptId = deptMap.get(row.departmentName.toLowerCase());
            if (!deptId) {
                errors.push({
                    row: rowNum,
                    field: 'department',
                    reason: `Unknown department '${row.departmentName}'`,
                });
                continue;
            }
            const desigId = desigMap.get(row.designationTitle.toLowerCase());
            if (!desigId) {
                errors.push({
                    row: rowNum,
                    field: 'designation',
                    reason: `Unknown designation '${row.designationTitle}'`,
                });
                continue;
            }
            const existingEmp = await employee_model_js_1.EmployeeModel.findOne({ email: row.email });
            if (existingEmp) {
                errors.push({
                    row: rowNum,
                    field: 'email',
                    reason: `Email '${row.email}' already exists in database`,
                });
                continue;
            }
            rowsToInsert.push({
                name: row.name,
                email: row.email,
                phone: row.phone,
                departmentId: deptId,
                designationId: desigId,
                joinDate: row.joinDate,
                basicSalary: row.basicSalary,
            });
        }
        if (dryRun) {
            return {
                dryRun: true,
                totalRows: validRows.length + (parseResult.errors.length ? 1 : 0),
                validCount: rowsToInsert.length,
                errorCount: errors.length,
                errors,
            };
        }
        if (errors.length > 0) {
            throw new errors_js_1.AppError('CSV_VALIDATION_FAILED', 422, 'CSV contains validation errors', {
                errors,
            });
        }
        // Commit insert
        const createdEmployees = [];
        for (const r of rowsToInsert) {
            const seq = await (0, employee_model_js_1.getNextSequence)('employee_code');
            const code = `EMP-${String(seq).padStart(4, '0')}`;
            const tempPassword = `Pass-${crypto_1.default.randomBytes(4).toString('hex')}!`;
            const passwordHash = await bcrypt_1.default.hash(tempPassword, env_js_1.env.BCRYPT_ROUNDS);
            const user = await user_model_js_1.UserModel.create({
                email: r.email,
                passwordHash,
                role: 'employee',
                isActive: true,
                mustChangePassword: true,
            });
            const emp = await employee_model_js_1.EmployeeModel.create({
                ...r,
                code,
                status: 'active',
                userId: user._id,
            });
            user.employeeId = emp._id;
            await user.save();
            createdEmployees.push(emp);
        }
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'CSV_IMPORT_EMPLOYEES',
            entity: 'employees',
            after: { importedCount: createdEmployees.length },
            ip,
        });
        return {
            dryRun: false,
            importedCount: createdEmployees.length,
        };
    }
    /**
     * Export all employees as CSV (F08)
     */
    static async exportCsv() {
        const employees = await employee_model_js_1.EmployeeModel.find()
            .populate('departmentId', 'name')
            .populate('designationId', 'title')
            .sort({ code: 1 })
            .lean();
        const headers = [
            'Code',
            'Name',
            'Email',
            'Phone',
            'Department',
            'Designation',
            'JoinDate',
            'Status',
            'BasicSalary',
        ];
        const lines = [headers.join(',')];
        for (const emp of employees) {
            const deptName = emp.departmentId?.name || '';
            const desigTitle = emp.designationId?.title || '';
            const values = [
                emp.code,
                `"${emp.name.replace(/"/g, '""')}"`,
                emp.email,
                emp.phone || '',
                `"${deptName.replace(/"/g, '""')}"`,
                `"${desigTitle.replace(/"/g, '""')}"`,
                emp.joinDate,
                emp.status,
                emp.basicSalary,
            ];
            lines.push(values.join(','));
        }
        return lines.join('\n');
    }
}
exports.EmployeeService = EmployeeService;
