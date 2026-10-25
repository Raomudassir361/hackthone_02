import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { EmployeeModel } from '../../src/modules/employees/employee.model.js';
import { AttendanceModel } from '../../src/modules/attendance/attendance.model.js';
import { LeaveRequestModel } from '../../src/modules/leave/leave.model.js';
import { PayrollRunModel } from '../../src/modules/payroll/payroll.model.js';

describe('Phase 6 Analytics & Dashboard Integration Tests (rules.md Section 3.7 & F18)', () => {
  let mongoServer: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;

  let adminToken: string;
  let hrToken: string;
  let empToken: string;

  let empId: string;
  let deptId: string;
  let desigId: string;

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
      companyName: 'Analytics Corp',
      timezone: 'Asia/Karachi',
      officeStart: '09:00',
      graceMinutes: 15,
      halfDayHours: 5,
      weekendDays: [0, 6],
      adminEmail: 'admin@analytics.test',
      adminPassword: 'Password123!',
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@analytics.test',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.token;

    // 2. Dept & Desig
    const deptRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Engineering', code: 'ENG' });
    deptId = deptRes.body.data._id;

    const desigRes = await request(app)
      .post('/api/designations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Software Engineer' });
    desigId = desigRes.body.data._id;

    // 3. HR User
    const hrRes = await request(app)
      .post('/api/users/hr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'HR Lead',
        email: 'hr@analytics.test',
        phone: '03001234567',
        departmentId: deptId,
        designationId: desigId,
        joinDate: '2026-01-01',
        basicSalary: 90000,
      });

    const hrTempPass = hrRes.body.data.temporaryPassword;
    const hrLogin1 = await request(app).post('/api/auth/login').send({
      email: 'hr@analytics.test',
      password: hrTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${hrLogin1.body.data.token}`)
      .send({ currentPassword: hrTempPass, newPassword: 'NewHrPassword123!' });

    const hrLogin2 = await request(app).post('/api/auth/login').send({
      email: 'hr@analytics.test',
      password: 'NewHrPassword123!',
    });
    hrToken = hrLogin2.body.data.token;

    // 4. Employee 1
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Bob Coder',
        email: 'bob@analytics.test',
        departmentId: deptId,
        designationId: desigId,
        joinDate: '2026-01-01',
        basicSalary: 60000,
      });
    empId = empRes.body.data.employee.id;
    const empTempPass = empRes.body.data.temporaryPassword;

    const empLogin1 = await request(app).post('/api/auth/login').send({
      email: 'bob@analytics.test',
      password: empTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${empLogin1.body.data.token}`)
      .send({ currentPassword: empTempPass, newPassword: 'EmpPassword123!' });

    const empLogin2 = await request(app).post('/api/auth/login').send({
      email: 'bob@analytics.test',
      password: 'EmpPassword123!',
    });
    empToken = empLogin2.body.data.token;
  });

  it('computes exact HR dashboard KPIs matching DB records', async () => {
    // Insert known attendance records for Bob
    const ruleSnapshot = {
      officeStart: '09:00',
      graceMinutes: 15,
      halfDayHours: 5,
    };

    await AttendanceModel.create([
      {
        employeeId: new mongoose.Types.ObjectId(empId),
        date: '2026-03-02',
        status: 'present',
        isWorkingDay: true,
        checkInAt: new Date('2026-03-02T04:00:00Z'),
        ruleSnapshot,
      },
      {
        employeeId: new mongoose.Types.ObjectId(empId),
        date: '2026-03-03',
        status: 'late',
        isWorkingDay: true,
        checkInAt: new Date('2026-03-03T04:20:00Z'),
        ruleSnapshot,
      },
      {
        employeeId: new mongoose.Types.ObjectId(empId),
        date: '2026-03-04',
        status: 'half_day',
        isWorkingDay: true,
        checkInAt: new Date('2026-03-04T04:00:00Z'),
        ruleSnapshot,
      },
    ]);

    const res = await request(app)
      .get('/api/dashboard/hr?from=2026-03-01&to=2026-03-31')
      .set('Authorization', `Bearer ${hrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.kpis).toBeDefined();

    // 2 employees total (HR employee + Bob)
    expect(res.body.data.kpis.headcount).toBe(2);

    // Numerator: 1 (present) + 1 (late) + 0.5 (half_day) = 2.5
    // Denominator: 3 records
    // Attendance rate = 2.5 / 3 * 100 = 83.33%
    expect(res.body.data.kpis.attendanceRate).toBe(83.33);

    // Late % = 1 late / (1 present + 1 late) * 100 = 50%
    expect(res.body.data.kpis.latePct).toBe(50);

    // Top late comers contains Bob with 1 late record
    expect(res.body.data.topLateComers.length).toBe(1);
    expect(res.body.data.topLateComers[0].name).toBe('Bob Coder');
    expect(res.body.data.topLateComers[0].lateCount).toBe(1);
  });

  it('computes Admin dashboard metrics: headcount, avg salary, and audit feed', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin?from=2026-01-01&to=2026-12-31')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.kpis.headcount).toBe(2);
    // Average salary of 90,000 and 60,000 = 75,000
    expect(res.body.data.kpis.avgSalary).toBe(75000);
    expect(res.body.data.recentAudit.length).toBeGreaterThan(0);

    // Employee cannot access Admin dashboard (403)
    const empAttempt = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${empToken}`);

    expect(empAttempt.status).toBe(403);
  });

  it('serves Employee personal dashboard with weekly hours and leave balance', async () => {
    const res = await request(app)
      .get('/api/dashboard/employee')
      .set('Authorization', `Bearer ${empToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.weeklyHours).toBe(0);
    expect(res.body.data.leaveBalances.length).toBe(3);
    expect(res.body.data.targetWeeklyHours).toBe(40);
  });
});
