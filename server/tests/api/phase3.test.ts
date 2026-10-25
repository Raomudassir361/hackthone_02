import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { SettingsModel, DepartmentModel, DesignationModel } from '../../src/modules/org/org.model.js';
import { EmployeeModel, CounterModel } from '../../src/modules/employees/employee.model.js';
import { AttendanceModel, AttendanceCorrectionModel } from '../../src/modules/attendance/attendance.model.js';

describe('Phase 3 Attendance Rules and Flow Tests', () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  let adminToken: string;
  let hrToken: string;
  let hrEmpId: string;
  let empToken: string;
  let empId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await SettingsModel.deleteMany({});
    await DepartmentModel.deleteMany({});
    await DesignationModel.deleteMany({});
    await EmployeeModel.deleteMany({});
    await CounterModel.deleteMany({});
    await AttendanceModel.deleteMany({});
    await AttendanceCorrectionModel.deleteMany({});

    // Setup Admin
    await request(app).post('/api/setup').send({
      companyName: 'Acme Attendance Corp',
      adminEmail: 'admin@acme.com',
      adminPassword: 'Password123!',
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@acme.com',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.token;

    // Create Dept & Desig
    const deptRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'IT Support', code: 'ITS' });

    const desigRes = await request(app)
      .post('/api/designations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'IT Officer' });

    // Create HR
    const hrRes = await request(app)
      .post('/api/users/hr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Hina HR',
        email: 'hina@acme.com',
        joinDate: '2026-01-01',
        basicSalary: 80000,
      });
    hrEmpId = hrRes.body.data.employee.id;
    const hrTempPass = hrRes.body.data.temporaryPassword;

    const hrInitLogin = await request(app).post('/api/auth/login').send({
      email: 'hina@acme.com',
      password: hrTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${hrInitLogin.body.data.token}`)
      .send({ currentPassword: hrTempPass, newPassword: 'NewHrPassword123!' });

    const hrFinalLogin = await request(app).post('/api/auth/login').send({
      email: 'hina@acme.com',
      password: 'NewHrPassword123!',
    });
    hrToken = hrFinalLogin.body.data.token;

    // Create Employee
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Zahid Khan',
        email: 'zahid@acme.com',
        departmentId: deptRes.body.data._id,
        designationId: desigRes.body.data._id,
        joinDate: '2026-02-01',
        basicSalary: 55000,
      });
    empId = empRes.body.data.employee.id;
    const empTempPass = empRes.body.data.temporaryPassword;

    const empInitLogin = await request(app).post('/api/auth/login').send({
      email: 'zahid@acme.com',
      password: empTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${empInitLogin.body.data.token}`)
      .send({ currentPassword: empTempPass, newPassword: 'NewEmpPassword123!' });

    const empFinalLogin = await request(app).post('/api/auth/login').send({
      email: 'zahid@acme.com',
      password: 'NewEmpPassword123!',
    });
    empToken = empFinalLogin.body.data.token;
  });

  it('records check-in with server timestamp and rejects duplicate check-in with 409', async () => {
    // First Check-in
    const checkInRes = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${empToken}`)
      .send({});
    expect(checkInRes.status).toBe(201);
    expect(checkInRes.body.data).toHaveProperty('checkInAt');
    expect(checkInRes.body.data).toHaveProperty('ruleSnapshot');
    expect(checkInRes.body.data.ruleSnapshot.officeStart).toBe('09:00');

    // Duplicate Check-in on same day -> 409 Conflict
    const dupRes = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${empToken}`)
      .send({});
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('DUPLICATE_CHECK_IN');
  });

  it('calculates workedMinutes and half_day on check-out', async () => {
    // Check in
    await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${empToken}`)
      .send({});

    // Check out immediately -> worked minutes < 5 hours -> status becomes half_day
    const checkOutRes = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${empToken}`)
      .send({});
    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.data.checkOutAt).toBeDefined();
    expect(checkOutRes.body.data.status).toBe('half_day');
  });

  it('provides attendance calendar and attendance board', async () => {
    // Check in
    await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${empToken}`)
      .send({});

    // Calendar for current month
    const calRes = await request(app)
      .get('/api/attendance/calendar?month=2026-10')
      .set('Authorization', `Bearer ${empToken}`);
    expect(calRes.status).toBe(200);
    expect(calRes.body.data.days.length).toBeGreaterThanOrEqual(28);

    // Board for Admin
    const boardRes = await request(app)
      .get('/api/attendance/board?date=2026-10-25')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(boardRes.status).toBe(200);
    expect(boardRes.body.data).toHaveProperty('summary');
    expect(boardRes.body.data.rows.length).toBeGreaterThan(0);
  });

  it('manages corrections: forbids self-approval, enforces HR corrections decided by Admin only', async () => {
    // Zahid requests correction
    const reqRes = await request(app)
      .post('/api/attendance/corrections')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        date: '2026-10-20',
        reason: 'Office badge reader malfunction at entrance gate',
      });
    expect(reqRes.status).toBe(201);
    const correctionId = reqRes.body.data._id;

    // Self-approval attempt by Zahid -> 403 Forbidden
    const selfDecide = await request(app)
      .post(`/api/attendance/corrections/${correctionId}/decide`)
      .set('Authorization', `Bearer ${empToken}`)
      .send({ status: 'approved', decisionComment: 'Self approval' });
    expect(selfDecide.status).toBe(403);

    // HR approves Zahid's correction -> 200
    const hrDecide = await request(app)
      .post(`/api/attendance/corrections/${correctionId}/decide`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'approved', decisionComment: 'Verified with security guard register' });
    expect(hrDecide.status).toBe(200);
    expect(hrDecide.body.data.status).toBe('approved');

    // Verify attendance record created with source = 'correction'
    const attRecord = await AttendanceModel.findOne({ employeeId: empId, date: '2026-10-20' });
    expect(attRecord?.source).toBe('correction');

    // HR requests own correction
    const hrReqRes = await request(app)
      .post('/api/attendance/corrections')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        date: '2026-10-21',
        reason: 'Field visit to university job fair',
      });
    const hrCorrectionId = hrReqRes.body.data._id;

    // HR attempts self approval -> 403
    const hrSelfApprove = await request(app)
      .post(`/api/attendance/corrections/${hrCorrectionId}/decide`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'approved', decisionComment: 'Self approve' });
    expect(hrSelfApprove.status).toBe(403);

    // Admin approves HR's correction -> 200
    const adminApprove = await request(app)
      .post(`/api/attendance/corrections/${hrCorrectionId}/decide`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved', decisionComment: 'Approved by management' });
    expect(adminApprove.status).toBe(200);
  });
});
