import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { SettingsModel, DepartmentModel, DesignationModel, LeaveTypeModel, HolidayModel } from '../../src/modules/org/org.model.js';
import { EmployeeModel, CounterModel } from '../../src/modules/employees/employee.model.js';
import { LeaveRequestModel } from '../../src/modules/leave/leave.model.js';

describe('Phase 4 Leave Service Rules & Integration Tests', () => {
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
    await LeaveTypeModel.deleteMany({});
    await HolidayModel.deleteMany({});
    await EmployeeModel.deleteMany({});
    await CounterModel.deleteMany({});
    await LeaveRequestModel.deleteMany({});

    // 1. Setup Admin
    await request(app).post('/api/setup').send({
      companyName: 'Acme Leave Corp',
      adminEmail: 'admin@acme.com',
      adminPassword: 'Password123!',
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@acme.com',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.token;

    // 2. Seed standard leave types per rules.md (annual 14, sick 8, casual 10, unpaid unlimited)
    await LeaveTypeModel.create([
      { key: 'annual', name: 'Annual Leave', yearlyQuota: 14, isPaid: true },
      { key: 'sick', name: 'Sick Leave', yearlyQuota: 8, isPaid: true },
      { key: 'casual', name: 'Casual Leave', yearlyQuota: 10, isPaid: true },
      { key: 'unpaid', name: 'Unpaid Leave', yearlyQuota: null, isPaid: false },
    ]);

    // 3. Seed a public holiday on 2026-11-04 (Wednesday)
    await HolidayModel.create({
      date: '2026-11-04',
      name: 'Mid-week Holiday',
    });

    // 4. Create Dept & Desig
    const deptRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Finance', code: 'FIN' });

    const desigRes = await request(app)
      .post('/api/designations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Accountant' });

    // 5. Create HR
    const hrRes = await request(app)
      .post('/api/users/hr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sara HR',
        email: 'sara@acme.com',
        joinDate: '2026-01-01',
        basicSalary: 85000,
      });
    hrEmpId = hrRes.body.data.employee.id;
    const hrTempPass = hrRes.body.data.temporaryPassword;

    const hrInitLogin = await request(app).post('/api/auth/login').send({
      email: 'sara@acme.com',
      password: hrTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${hrInitLogin.body.data.token}`)
      .send({ currentPassword: hrTempPass, newPassword: 'NewHrPassword123!' });

    const hrFinalLogin = await request(app).post('/api/auth/login').send({
      email: 'sara@acme.com',
      password: 'NewHrPassword123!',
    });
    hrToken = hrFinalLogin.body.data.token;

    // 6. Create Employee
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Usman Ali',
        email: 'usman@acme.com',
        departmentId: deptRes.body.data._id,
        designationId: desigRes.body.data._id,
        joinDate: '2026-01-15',
        basicSalary: 60000,
      });
    empId = empRes.body.data.employee.id;
    const empTempPass = empRes.body.data.temporaryPassword;

    const empInitLogin = await request(app).post('/api/auth/login').send({
      email: 'usman@acme.com',
      password: empTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${empInitLogin.body.data.token}`)
      .send({ currentPassword: empTempPass, newPassword: 'NewEmpPassword123!' });

    const empFinalLogin = await request(app).post('/api/auth/login').send({
      email: 'usman@acme.com',
      password: 'NewEmpPassword123!',
    });
    empToken = empFinalLogin.body.data.token;
  });

  it('skips weekends and public holidays when counting working days', async () => {
    // 2026-11-02 (Monday) to 2026-11-08 (Sunday)
    // Mon, Tue, Wed (Holiday), Thu, Fri, Sat (Weekend), Sun (Weekend)
    // Expected working days: 4
    const previewRes = await request(app)
      .get('/api/leave/preview?startDate=2026-11-02&endDate=2026-11-08')
      .set('Authorization', `Bearer ${empToken}`);

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.workingDays).toBe(4);
  });

  it('rejects leave applications with zero working days with 422', async () => {
    // Weekend only: 2026-11-07 (Sat) to 2026-11-08 (Sun)
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        leaveTypeKey: 'casual',
        startDate: '2026-11-07',
        endDate: '2026-11-08',
        reason: 'Weekend trip',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('ZERO_WORKING_DAYS');
  });

  it('rejects overlapping leave requests with 422', async () => {
    // 1. Submit first leave request (Mon–Tue: 2026-11-09 to 2026-11-10)
    const firstReq = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        leaveTypeKey: 'annual',
        startDate: '2026-11-09',
        endDate: '2026-11-10',
        reason: 'Personal break',
      });
    expect(firstReq.status).toBe(201);

    // 2. Submit overlapping request (Tue–Wed: 2026-11-10 to 2026-11-11)
    const overlapReq = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        leaveTypeKey: 'sick',
        startDate: '2026-11-10',
        endDate: '2026-11-11',
        reason: 'Doctor visit',
      });

    expect(overlapReq.status).toBe(422);
    expect(overlapReq.body.error.code).toBe('LEAVE_OVERLAP');
  });

  it('rejects over-balance requests with 422 but allows unlimited unpaid leave', async () => {
    // Sick leave quota is 8 days. Request 9 working days.
    // 2026-11-16 (Mon) to 2026-11-26 (Thu) has 9 working days (skipping Sat–Sun 21–22)
    const overBalanceReq = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        leaveTypeKey: 'sick',
        startDate: '2026-11-16',
        endDate: '2026-11-26',
        reason: 'Medical recovery',
      });

    expect(overBalanceReq.status).toBe(422);
    expect(overBalanceReq.body.error.code).toBe('OVER_BALANCE');

    // Unpaid leave is unlimited (quota = null) -> 9 days should succeed
    const unpaidReq = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        leaveTypeKey: 'unpaid',
        startDate: '2026-11-16',
        endDate: '2026-11-26',
        reason: 'Unpaid personal sabbatical',
      });

    expect(unpaidReq.status).toBe(201);
    expect(unpaidReq.body.data.workingDays).toBe(9);
  });

  it('handles decision flow: forbids self-approval, allows cancellation of pending requests', async () => {
    // 1. Usman applies for casual leave
    const applyRes = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        leaveTypeKey: 'casual',
        startDate: '2026-11-30',
        endDate: '2026-11-30',
        reason: 'Family emergency',
      });
    const requestId = applyRes.body.data._id;

    // 2. Usman attempts to approve his own leave -> 403 Forbidden
    const selfApprove = await request(app)
      .post(`/api/leave/${requestId}/decide`)
      .set('Authorization', `Bearer ${empToken}`)
      .send({ status: 'approved', decisionComment: 'Self approved' });
    expect(selfApprove.status).toBe(403);

    // 3. Usman cancels his own request -> 200 OK
    const cancelRes = await request(app)
      .post(`/api/leave/${requestId}/cancel`)
      .set('Authorization', `Bearer ${empToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');

    // 4. Sara HR applies for leave
    const hrApplyRes = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        leaveTypeKey: 'casual',
        startDate: '2026-12-01',
        endDate: '2026-12-01',
        reason: 'HR Conference travel',
      });
    const hrReqId = hrApplyRes.body.data._id;

    // 5. Sara attempts self approval -> 403
    const hrSelfApprove = await request(app)
      .post(`/api/leave/${hrReqId}/decide`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'approved', decisionComment: 'Approve self' });
    expect(hrSelfApprove.status).toBe(403);

    // 6. Admin approves Sara's leave -> 200
    const adminApprove = await request(app)
      .post(`/api/leave/${hrReqId}/decide`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved', decisionComment: 'Approved by Managing Director' });
    expect(adminApprove.status).toBe(200);
    expect(adminApprove.body.data.status).toBe('approved');
  });
});
