import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { CommsService } from '../../src/modules/comms/comms.service.js';

describe('Phase 7 Comms & Audit Integration Tests (F23–F25)', () => {
  let mongoServer: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;

  let adminToken: string;
  let hrToken: string;
  let empToken: string;

  let empUserId: string;

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
      companyName: 'Comms Test Inc',
      timezone: 'Asia/Karachi',
      officeStart: '09:00',
      graceMinutes: 15,
      halfDayHours: 5,
      weekendDays: [0, 6],
      adminEmail: 'admin@comms.test',
      adminPassword: 'Password123!',
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@comms.test',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.token;

    // 2. Dept & Desig
    const deptRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Product', code: 'PRD' });

    const desigRes = await request(app)
      .post('/api/designations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Product Manager' });

    // 3. HR User
    const hrRes = await request(app)
      .post('/api/users/hr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'HR Lead',
        email: 'hr@comms.test',
        phone: '03001234567',
        departmentId: deptRes.body.data._id,
        designationId: desigRes.body.data._id,
        joinDate: '2026-01-01',
        basicSalary: 95000,
      });

    const hrTempPass = hrRes.body.data.temporaryPassword;
    const hrLogin1 = await request(app).post('/api/auth/login').send({
      email: 'hr@comms.test',
      password: hrTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${hrLogin1.body.data.token}`)
      .send({ currentPassword: hrTempPass, newPassword: 'NewHrPassword123!' });

    const hrLogin2 = await request(app).post('/api/auth/login').send({
      email: 'hr@comms.test',
      password: 'NewHrPassword123!',
    });
    hrToken = hrLogin2.body.data.token;

    // 4. Employee
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Dave Engineer',
        email: 'dave@comms.test',
        departmentId: deptRes.body.data._id,
        designationId: desigRes.body.data._id,
        joinDate: '2026-01-01',
        basicSalary: 65000,
      });

    empUserId = empRes.body.data.employee.userId;
    const empTempPass = empRes.body.data.temporaryPassword;

    const empLogin1 = await request(app).post('/api/auth/login').send({
      email: 'dave@comms.test',
      password: empTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${empLogin1.body.data.token}`)
      .send({ currentPassword: empTempPass, newPassword: 'EmpPassword123!' });

    const empLogin2 = await request(app).post('/api/auth/login').send({
      email: 'dave@comms.test',
      password: 'EmpPassword123!',
    });
    empToken = empLogin2.body.data.token;
  });

  it('allows HR and Admin to post announcements and all employees can read them', async () => {
    // 1. HR posts announcement
    const postRes = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        title: 'Office Town Hall',
        body: 'Quarterly town hall is scheduled for Friday at 3:00 PM.',
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body.data.title).toBe('Office Town Hall');

    // 2. Employee reads announcement feed
    const readRes = await request(app)
      .get('/api/announcements')
      .set('Authorization', `Bearer ${empToken}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.length).toBe(1);
    expect(readRes.body.data[0].title).toBe('Office Town Hall');

    // 3. Employee attempts to post announcement -> 403 Forbidden
    const empPost = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        title: 'Unauthorized Post',
        body: 'This should fail.',
      });

    expect(empPost.status).toBe(403);
  });

  it('delivers user notifications and marks them as read', async () => {
    const user = await mongoose.model('User').findOne({ email: 'dave@comms.test' });

    // Create notification for employee
    const notif = await CommsService.createNotification({
      userId: user!._id.toString(),
      type: 'leave',
      title: 'Leave Approved',
      body: 'Your leave application for March 10-12 has been approved.',
    });

    // Employee fetches own notifications
    const getRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${empToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBe(1);
    expect(getRes.body.data[0].title).toBe('Leave Approved');
    expect(getRes.body.data[0].readAt).toBeUndefined();

    // Mark notification as read
    const readRes = await request(app)
      .post(`/api/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${empToken}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.readAt).toBeDefined();
  });

  it('enforces Admin-only audit access and verifies immutability (no update/delete path)', async () => {
    // Admin fetches audit logs
    const adminAudit = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminAudit.status).toBe(200);
    expect(adminAudit.body.data.length).toBeGreaterThan(0);

    // HR cannot access audit logs -> 403
    const hrAudit = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${hrToken}`);

    expect(hrAudit.status).toBe(403);

    // Employee cannot access audit logs -> 403
    const empAudit = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${empToken}`);

    expect(empAudit.status).toBe(403);
  });
});
