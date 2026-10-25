import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { SettingsModel } from '../../src/modules/org/org.model.js';
import { EmployeeModel } from '../../src/modules/employees/employee.model.js';
import { DepartmentModel, DesignationModel } from '../../src/modules/org/org.model.js';

describe('Phase 9 Hardening — RBAC Matrix & Input Validation Sweep (T9.1 & T9.2)', () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  let adminToken: string;
  let hrToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    // 1. Initial Setup
    await request(app).post('/api/setup').send({
      companyName: 'Matrix Org',
      adminEmail: 'admin@matrix.local',
      adminPassword: 'Password123!',
    });

    // 2. Admin Login
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@matrix.local',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.token;

    // 3. Create Department & Designation
    const dept = await DepartmentModel.create({ name: 'Engineering', code: 'ENG' });
    const desig = await DesignationModel.create({ title: 'Developer', code: 'DEV' });

    // 4. Create HR User via Admin
    const createHrRes = await request(app)
      .post('/api/users/hr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'HR Officer',
        email: 'hr@matrix.local',
        joinDate: '2026-01-01',
        basicSalary: 120000,
      });
    const hrTempPass = createHrRes.body.data.temporaryPassword;

    // HR logs in and sets password
    const hrLogin1 = await request(app).post('/api/auth/login').send({
      email: 'hr@matrix.local',
      password: hrTempPass,
    });
    const hrTempToken = hrLogin1.body.data.token;
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${hrTempToken}`)
      .send({
        currentPassword: hrTempPass,
        newPassword: 'BrandNewPassword123!',
      });
    const hrLoginFinal = await request(app).post('/api/auth/login').send({
      email: 'hr@matrix.local',
      password: 'BrandNewPassword123!',
    });
    hrToken = hrLoginFinal.body.data.token;

    // 5. Create Employee via HR
    const createEmpRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Regular Developer',
        email: 'dev@matrix.local',
        phone: '03001234567',
        departmentId: dept._id.toString(),
        designationId: desig._id.toString(),
        joinDate: '2026-01-01',
        basicSalary: 90000,
      });
    const empTempPass = createEmpRes.body.data.temporaryPassword;

    // Employee logs in and changes password
    const empLogin1 = await request(app).post('/api/auth/login').send({
      email: 'dev@matrix.local',
      password: empTempPass,
    });
    const empTempToken = empLogin1.body.data.token;
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${empTempToken}`)
      .send({
        currentPassword: empTempPass,
        newPassword: 'BrandNewPassword123!',
      });
    const empLoginFinal = await request(app).post('/api/auth/login').send({
      email: 'dev@matrix.local',
      password: 'BrandNewPassword123!',
    });
    employeeToken = empLoginFinal.body.data.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  describe('T9.1 RBAC Matrix across endpoints', () => {
    it('enforces Admin-only routes (users & audit)', async () => {
      // Audit endpoint
      const resAuditAdmin = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resAuditAdmin.status).toBe(200);

      const resAuditHr = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${hrToken}`);
      expect(resAuditHr.status).toBe(403);

      const resAuditEmp = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(resAuditEmp.status).toBe(403);

      // Users endpoint
      const resUsersAdmin = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resUsersAdmin.status).toBe(200);

      const resUsersHr = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${hrToken}`);
      expect(resUsersHr.status).toBe(403);

      const resUsersEmp = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(resUsersEmp.status).toBe(403);
    });

    it('enforces HR and Admin access on employee salary updates and blocks regular employee', async () => {
      // Regular employee cannot create new employees -> 403
      const resEmpCreate = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Hacker' });
      expect(resEmpCreate.status).toBe(403);

      // Regular employee cannot update salary -> 403
      const resEmpRegular = await request(app)
        .put('/api/employees/671000000000000000000001/salary')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          base: 100000,
          currency: 'PKR',
          effectiveDate: '2026-01-01',
        });
      expect(resEmpRegular.status).toBe(403);
    });

    it('enforces Admin-only on payroll finalization (HR forbidden)', async () => {
      const resFinalizeHr = await request(app)
        .post('/api/payroll/runs/671000000000000000000001/finalize')
        .set('Authorization', `Bearer ${hrToken}`);
      expect(resFinalizeHr.status).toBe(403);
    });
  });

  describe('T9.2 Input Validation Sweep (Zod schemas & malformed inputs)', () => {
    it('rejects malformed email and short passwords on login with 400', async () => {
      const resBad = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: '123' });
      expect(resBad.status).toBe(400);
      expect(resBad.body.error).toBeDefined();
    });

    it('rejects invalid leave application dates with 400', async () => {
      const resBad = await request(app)
        .post('/api/leave')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeKey: 'annual',
          startDate: 'invalid-date',
          endDate: '2026-10-25',
          reason: 'Test',
        });
      expect(resBad.status).toBe(400);
    });

    it('rejects malformed announcement payloads with 400', async () => {
      const resBad = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '', // empty title violates min(1)
          content: 'Some message',
        });
      expect(resBad.status).toBe(400);
    });
  });
});
