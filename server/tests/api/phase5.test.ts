import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { EmployeeModel } from '../../src/modules/employees/employee.model.js';
import { DepartmentModel, DesignationModel } from '../../src/modules/org/org.model.js';
import { SettingsModel } from '../../src/modules/settings/settings.model.js';
import { PayrollRunModel, PayslipModel } from '../../src/modules/payroll/payroll.model.js';

describe('Phase 5 Payroll Service Integration Tests (rules.md Section 3.6)', () => {
  let mongoServer: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;

  let adminToken: string;
  let hrToken: string;
  let emp1Token: string;
  let emp2Token: string;

  let emp1Id: string;
  let emp2Id: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();

    // 1. Setup Company
    await request(app).post('/api/setup').send({
      companyName: 'Payroll Test Corp',
      timezone: 'Asia/Karachi',
      officeStart: '09:00',
      graceMinutes: 15,
      halfDayHours: 5,
      weekendDays: [0, 6],
      adminEmail: 'admin@payroll.test',
      adminPassword: 'Password123!',
    });

    // Login Admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@payroll.test',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.token;

    // Create Department and Designation
    const deptRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Engineering', code: 'ENG' });
    const deptId = deptRes.body.data._id;

    const desigRes = await request(app)
      .post('/api/designations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Software Engineer' });
    const desigId = desigRes.body.data._id;

    // 2. Create HR User
    const hrRes = await request(app)
      .post('/api/users/hr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'HR Lead',
        email: 'hr@payroll.test',
        phone: '03001234567',
        departmentId: deptId,
        designationId: desigId,
        joinDate: '2026-01-01',
        basicSalary: 80000,
      });

    const hrTempPass = hrRes.body.data.temporaryPassword;

    // Change HR password
    const hrLogin1 = await request(app).post('/api/auth/login').send({
      email: 'hr@payroll.test',
      password: hrTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${hrLogin1.body.data.token}`)
      .send({ currentPassword: hrTempPass, newPassword: 'NewPassword123!' });

    const hrLogin2 = await request(app).post('/api/auth/login').send({
      email: 'hr@payroll.test',
      password: 'NewPassword123!',
    });
    hrToken = hrLogin2.body.data.token;

    // 3. Register Employee 1 (Basic Salary 60,000 -> Gross 90,000)
    const emp1Res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Alice Engineer',
        email: 'alice@payroll.test',
        departmentId: deptId,
        designationId: desigId,
        joinDate: '2026-01-01',
        basicSalary: 60000,
      });
    emp1Id = emp1Res.body.data.employee.id;
    const emp1TempPass = emp1Res.body.data.temporaryPassword;

    const emp1Login1 = await request(app).post('/api/auth/login').send({
      email: 'alice@payroll.test',
      password: emp1TempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${emp1Login1.body.data.token}`)
      .send({ currentPassword: emp1TempPass, newPassword: 'Emp1Password123!' });

    const emp1Login2 = await request(app).post('/api/auth/login').send({
      email: 'alice@payroll.test',
      password: 'Emp1Password123!',
    });
    emp1Token = emp1Login2.body.data.token;

    // 4. Register Employee 2
    const emp2Res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Bob Designer',
        email: 'bob@payroll.test',
        departmentId: deptId,
        designationId: desigId,
        joinDate: '2026-01-01',
        basicSalary: 50000,
      });
    emp2Id = emp2Res.body.data.employee.id;
    const emp2TempPass = emp2Res.body.data.temporaryPassword;

    const emp2Login1 = await request(app).post('/api/auth/login').send({
      email: 'bob@payroll.test',
      password: emp2TempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${emp2Login1.body.data.token}`)
      .send({ currentPassword: emp2TempPass, newPassword: 'Emp2Password123!' });

    const emp2Login2 = await request(app).post('/api/auth/login').send({
      email: 'bob@payroll.test',
      password: 'Emp2Password123!',
    });
    emp2Token = emp2Login2.body.data.token;
  });

  it('allows HR to create draft payroll run and blocks duplicate month with 409', async () => {
    // HR creates draft run for 2026-03
    const res = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2026-03' });

    expect(res.status).toBe(201);
    expect(res.body.data.month).toBe('2026-03');
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.totals.employeeCount).toBeGreaterThanOrEqual(2);

    // Duplicate draft run creation must return 409
    const dupRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2026-03' });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('DUPLICATE_PAYROLL_RUN');
  });

  it('forbids HR from finalizing payroll (403), only Admin can finalize', async () => {
    const draftRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2026-03' });

    const runId = draftRes.body.data._id;

    // HR attempts to finalize -> 403 Forbidden
    const hrFinalize = await request(app)
      .post(`/api/payroll/runs/${runId}/finalize`)
      .set('Authorization', `Bearer ${hrToken}`);

    expect(hrFinalize.status).toBe(403);

    // Admin finalizes -> 200 OK
    const adminFinalize = await request(app)
      .post(`/api/payroll/runs/${runId}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminFinalize.status).toBe(200);
    expect(adminFinalize.body.data.status).toBe('finalized');
  });

  it('locks finalized run: any attempt to regenerate returns 409', async () => {
    const draftRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2026-03' });

    const runId = draftRes.body.data._id;

    // Admin finalizes
    await request(app)
      .post(`/api/payroll/runs/${runId}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`);

    // HR attempts to regenerate finalized run -> 409
    const regenRes = await request(app)
      .post(`/api/payroll/runs/${runId}/regenerate`)
      .set('Authorization', `Bearer ${hrToken}`);

    expect(regenRes.status).toBe(409);
    expect(regenRes.body.error.code).toBe('PAYROLL_LOCKED');
  });

  it('enforces payslip scoping: Employee sees only own payslip, cannot fetch other employee PDF', async () => {
    // 1. Create and finalize payroll
    const draftRes = await request(app)
      .post('/api/payroll/runs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2026-03' });

    const runId = draftRes.body.data._id;

    await request(app)
      .post(`/api/payroll/runs/${runId}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Fetch materialized payslips
    const payslips = await PayslipModel.find({ month: '2026-03' }).lean();
    expect(payslips.length).toBeGreaterThanOrEqual(2);

    const emp1Payslip = payslips.find((p) => p.employeeId.toString() === emp1Id);
    const emp2Payslip = payslips.find((p) => p.employeeId.toString() === emp2Id);
    expect(emp1Payslip).toBeDefined();
    expect(emp2Payslip).toBeDefined();

    // 2. Emp1 gets payslips list -> returns only their own payslip
    const emp1List = await request(app)
      .get('/api/payslips')
      .set('Authorization', `Bearer ${emp1Token}`);

    expect(emp1List.status).toBe(200);
    expect(emp1List.body.data.length).toBe(1);
    expect(emp1List.body.data[0]._id).toBe(emp1Payslip!._id.toString());

    // 3. Emp1 downloads own PDF -> 200 with application/pdf
    const emp1Pdf = await request(app)
      .get(`/api/payslips/${emp1Payslip!._id}/pdf`)
      .set('Authorization', `Bearer ${emp1Token}`);

    expect(emp1Pdf.status).toBe(200);
    expect(emp1Pdf.headers['content-type']).toContain('application/pdf');

    // 4. Emp1 attempts to download Emp2's PDF -> 404 (data scope protection)
    const crossPdf = await request(app)
      .get(`/api/payslips/${emp2Payslip!._id}/pdf`)
      .set('Authorization', `Bearer ${emp1Token}`);

    expect(crossPdf.status).toBe(404);
  });
});
