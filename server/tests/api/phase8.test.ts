import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { AiLogModel } from '../../src/modules/ai/ai.model.js';

describe('Phase 8 AI Assistant Guardrail Tests (F19–F22 & rules.md Section 3.11)', () => {
  let mongoServer: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;

  let adminToken: string;
  let hrToken: string;
  let empToken: string;

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
      companyName: 'AI Security Corp',
      timezone: 'Asia/Karachi',
      officeStart: '09:00',
      graceMinutes: 15,
      halfDayHours: 5,
      weekendDays: [0, 6],
      adminEmail: 'admin@ai.test',
      adminPassword: 'Password123!',
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@ai.test',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.token;

    // 2. Dept & Desig
    const deptRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Engineering', code: 'ENG' });

    const desigRes = await request(app)
      .post('/api/designations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Software Engineer' });

    // 3. HR User
    const hrRes = await request(app)
      .post('/api/users/hr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'HR Lead',
        email: 'hr@ai.test',
        phone: '03001234567',
        departmentId: deptRes.body.data._id,
        designationId: desigRes.body.data._id,
        joinDate: '2026-01-01',
        basicSalary: 95000,
      });

    const hrTempPass = hrRes.body.data.temporaryPassword;
    const hrLogin1 = await request(app).post('/api/auth/login').send({
      email: 'hr@ai.test',
      password: hrTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${hrLogin1.body.data.token}`)
      .send({ currentPassword: hrTempPass, newPassword: 'NewHrPassword123!' });

    const hrLogin2 = await request(app).post('/api/auth/login').send({
      email: 'hr@ai.test',
      password: 'NewHrPassword123!',
    });
    hrToken = hrLogin2.body.data.token;

    // 4. Employee
    const empRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Eve Developer',
        email: 'eve@ai.test',
        departmentId: deptRes.body.data._id,
        designationId: desigRes.body.data._id,
        joinDate: '2026-01-01',
        basicSalary: 70000,
      });

    const empTempPass = empRes.body.data.temporaryPassword;
    const empLogin1 = await request(app).post('/api/auth/login').send({
      email: 'eve@ai.test',
      password: empTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${empLogin1.body.data.token}`)
      .send({ currentPassword: empTempPass, newPassword: 'EmpPassword123!' });

    const empLogin2 = await request(app).post('/api/auth/login').send({
      email: 'eve@ai.test',
      password: 'EmpPassword123!',
    });
    empToken = empLogin2.body.data.token;
  });

  it('refuses to reveal colleague salary to an Employee', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ message: "What is my colleague's salary?" });

    expect(res.status).toBe(200);
    expect(res.body.data.label).toContain('AI-generated');
    expect(res.body.data.answer.toLowerCase()).toMatch(/confidential|private|cannot/);
  });

  it('allows HR to query employee headcount and late comers via AI tools', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ message: 'What is the current headcount?' });

    expect(res.status).toBe(200);
    expect(res.body.data.toolCalls.length).toBeGreaterThan(0);
    expect(res.body.data.toolCalls[0].name).toBe('get_headcount');
  });

  it('handles smart leave parsing and recomputes working days', async () => {
    const res = await request(app)
      .post('/api/ai/smart-leave')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ text: "I need next Monday and Tuesday off for my sister's wedding." });

    expect(res.status).toBe(200);
    expect(res.body.data.fallback).toBe(false);
    expect(res.body.data.data.workingDays).toBeGreaterThan(0);
    expect(res.body.data.data.reason).toMatch(/wedding/i);
  });

  it('enforces 20 requests per hour rate limit returning 429', async () => {
    // Populate 20 logs for employee
    const user = await mongoose.model('User').findOne({ email: 'eve@ai.test' });
    const logs = [];
    for (let i = 0; i < 20; i++) {
      logs.push({
        userId: user!._id,
        role: 'employee',
        kind: 'chat',
        prompt: `query ${i}`,
        response: 'response',
        latencyMs: 10,
        status: 'success',
        createdAt: new Date(),
      });
    }
    await AiLogModel.insertMany(logs);

    // 21st request should be rejected with 429
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ message: 'Hello assistant!' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('AI_RATE_LIMIT_EXCEEDED');
  });
});
