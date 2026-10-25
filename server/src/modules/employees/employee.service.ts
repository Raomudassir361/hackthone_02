import crypto from 'crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import { EmployeeModel, getNextSequence, IEmployee } from './employee.model.js';
import { UserModel } from '../auth/user.model.js';
import { DepartmentModel, DesignationModel } from '../org/org.model.js';
import { AuditService } from '../audit/audit.service.js';
import { RequestContext } from '../../middleware/auth.js';
import { buildPaginationResponse } from '../../shared/pagination.js';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  UpdateProfileInput,
  UpdateSalaryInput,
  GetEmployeesQuery,
} from './employee.schema.js';
import { CsvImportParser } from './csvImport.service.js';

export class EmployeeService {
  /**
   * Create single employee and linked user login with temporary password (F06)
   */
  public static async createEmployee(
    ctx: RequestContext,
    input: CreateEmployeeInput,
    ip?: string
  ) {
    const existingUser = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (existingUser) {
      throw new AppError('USER_EXISTS', 409, 'An account with this email already exists');
    }

    const existingEmp = await EmployeeModel.findOne({ email: input.email.toLowerCase() });
    if (existingEmp) {
      throw new AppError('EMPLOYEE_EXISTS', 409, 'An employee with this email already exists');
    }

    // Verify department and designation exist
    const department = await DepartmentModel.findById(input.departmentId);
    if (!department) {
      throw new AppError('NOT_FOUND', 404, 'Specified Department not found');
    }

    const designation = await DesignationModel.findById(input.designationId);
    if (!designation) {
      throw new AppError('NOT_FOUND', 404, 'Specified Designation not found');
    }

    // Generate code EMP-0001
    const seq = await getNextSequence('employee_code');
    const code = `EMP-${String(seq).padStart(4, '0')}`;

    // Generate temporary password
    const tempPassword = `Pass-${crypto.randomBytes(4).toString('hex')}!`;
    const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

    // Create User record
    const user = await UserModel.create({
      email: input.email.toLowerCase(),
      passwordHash,
      role: 'employee',
      isActive: true,
      mustChangePassword: true,
    });

    // Create Employee record
    const employee = await EmployeeModel.create({
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

    await AuditService.log({
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
  public static async updateEmployee(
    ctx: RequestContext,
    id: string,
    input: UpdateEmployeeInput,
    ip?: string
  ) {
    const before = await EmployeeModel.findById(id);
    if (!before) {
      throw new AppError('NOT_FOUND', 404, 'Employee not found');
    }

    if (input.email && input.email.toLowerCase() !== before.email) {
      const emailTaken = await EmployeeModel.findOne({ email: input.email.toLowerCase() });
      if (emailTaken) {
        throw new AppError('DUPLICATE_EMAIL', 409, 'Email is already used by another employee');
      }
      // Also update linked user email
      if (before.userId) {
        await UserModel.findByIdAndUpdate(before.userId, { email: input.email.toLowerCase() });
      }
    }

    const updated = await EmployeeModel.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true, runValidators: true }
    );

    await AuditService.log({
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
  public static async getEmployees(ctx: RequestContext, query: GetEmployeesQuery) {
    const filter: Record<string, unknown> = {};

    // Data-scope rule: If role is employee, force own employeeId
    if (ctx.role === 'employee') {
      if (!ctx.employeeId) {
        return buildPaginationResponse([], 0, query.page, query.limit);
      }
      filter._id = new mongoose.Types.ObjectId(ctx.employeeId);
    } else {
      if (query.departmentId) {
        filter.departmentId = new mongoose.Types.ObjectId(query.departmentId);
      }
      if (query.designationId) {
        filter.designationId = new mongoose.Types.ObjectId(query.designationId);
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
      EmployeeModel.countDocuments(filter),
      EmployeeModel.find(filter)
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

    return buildPaginationResponse(sanitized, total, query.page, query.limit);
  }

  /**
   * Get single employee 360 overview (F07)
   * If an Employee role attempts to access someone else's ID, return 404 per rules.md
   */
  public static async getEmployeeById(ctx: RequestContext, id: string) {
    if (ctx.role === 'employee' && ctx.employeeId !== id) {
      throw new AppError('NOT_FOUND', 404, 'Employee record not found');
    }

    const employee = await EmployeeModel.findById(id)
      .populate('departmentId', 'name code')
      .populate('designationId', 'title')
      .lean();

    if (!employee) {
      throw new AppError('NOT_FOUND', 404, 'Employee record not found');
    }

    return employee;
  }

  /**
   * Employee self-service edit (phone and address only, F06)
   */
  public static async updateOwnProfile(
    ctx: RequestContext,
    input: UpdateProfileInput,
    ip?: string
  ) {
    if (!ctx.employeeId) {
      throw new AppError('NOT_FOUND', 404, 'No linked employee profile found for user');
    }

    const before = await EmployeeModel.findById(ctx.employeeId);
    if (!before) {
      throw new AppError('NOT_FOUND', 404, 'Employee record not found');
    }

    const updateFields: { phone?: string; address?: string } = {};
    if (input.phone !== undefined) updateFields.phone = input.phone;
    if (input.address !== undefined) updateFields.address = input.address;

    const updated = await EmployeeModel.findByIdAndUpdate(
      ctx.employeeId,
      { $set: updateFields },
      { new: true }
    );

    await AuditService.log({
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
  public static async getSalary(ctx: RequestContext, employeeId: string) {
    if (ctx.role === 'employee') {
      if (ctx.employeeId !== employeeId) {
        throw new AppError('NOT_FOUND', 404, 'Record not found');
      }
    }

    const employee = await EmployeeModel.findById(employeeId).select('name code basicSalary');
    if (!employee) {
      throw new AppError('NOT_FOUND', 404, 'Employee not found');
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

  public static async updateSalary(
    ctx: RequestContext,
    employeeId: string,
    input: UpdateSalaryInput,
    ip?: string
  ) {
    // Rule: Nobody edits own salary!
    if (ctx.employeeId === employeeId) {
      throw new AppError('FORBIDDEN', 403, 'You cannot edit your own salary structure');
    }

    const before = await EmployeeModel.findById(employeeId);
    if (!before) {
      throw new AppError('NOT_FOUND', 404, 'Employee not found');
    }

    before.basicSalary = input.basicSalary;
    await before.save();

    await AuditService.log({
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
  public static async importCsv(
    ctx: RequestContext,
    csvContent: string,
    dryRun: boolean,
    ip?: string
  ) {
    const parseResult = CsvImportParser.parse(csvContent);
    const errors = [...parseResult.errors];
    const validRows = parseResult.validRows;

    // Resolve departments and designations
    const allDepts = await DepartmentModel.find();
    const allDesigs = await DesignationModel.find();

    const deptMap = new Map<string, mongoose.Types.ObjectId>();
    allDepts.forEach((d) => {
      deptMap.set(d.name.toLowerCase(), d._id as mongoose.Types.ObjectId);
      deptMap.set(d.code.toLowerCase(), d._id as mongoose.Types.ObjectId);
    });

    const desigMap = new Map<string, mongoose.Types.ObjectId>();
    allDesigs.forEach((d) => {
      desigMap.set(d.title.toLowerCase(), d._id as mongoose.Types.ObjectId);
    });

    // Check DB conflicts for valid rows
    const rowsToInsert: Array<{
      name: string;
      email: string;
      phone?: string;
      departmentId: mongoose.Types.ObjectId;
      designationId: mongoose.Types.ObjectId;
      joinDate: string;
      basicSalary: number;
    }> = [];

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

      const existingEmp = await EmployeeModel.findOne({ email: row.email });
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
      throw new AppError('CSV_VALIDATION_FAILED', 422, 'CSV contains validation errors', {
        errors,
      });
    }

    // Commit insert
    const createdEmployees: IEmployee[] = [];
    for (const r of rowsToInsert) {
      const seq = await getNextSequence('employee_code');
      const code = `EMP-${String(seq).padStart(4, '0')}`;

      const tempPassword = `Pass-${crypto.randomBytes(4).toString('hex')}!`;
      const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

      const user = await UserModel.create({
        email: r.email,
        passwordHash,
        role: 'employee',
        isActive: true,
        mustChangePassword: true,
      });

      const emp = await EmployeeModel.create({
        ...r,
        code,
        status: 'active',
        userId: user._id,
      });

      user.employeeId = emp._id;
      await user.save();

      createdEmployees.push(emp);
    }

    await AuditService.log({
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
  public static async exportCsv() {
    const employees = await EmployeeModel.find()
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
      const deptName = (emp.departmentId as { name?: string })?.name || '';
      const desigTitle = (emp.designationId as { title?: string })?.title || '';
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
