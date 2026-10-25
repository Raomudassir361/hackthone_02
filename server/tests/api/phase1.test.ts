import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { SettingsModel } from '../../src/modules/org/org.model.js';

describe('Phase 1 Auth, RBAC & Setup Tests', () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

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
  });

  it('performs first-run setup and blocks subsequent setups with 409', async () => {
    // 1. Initial setup status
    const statusRes = await request(app).get('/api/setup/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.setupComplete).toBe(false);

    // 2. Perform first-run setup
    const setupRes = await request(app).post('/api/setup').send({
      companyName: 'Acme Corp',
      adminEmail: 'admin@acme.com',
      adminPassword: 'Password123!',
    });
    expect(setupRes.status).toBe(201);
    expect(setupRes.body.data.companyName).toBe('Acme Corp');

    // 3. Second setup call must fail with 409
    const duplicateRes = await request(app).post('/api/setup').send({
      companyName: 'Another Corp',
      adminEmail: 'admin2@acme.com',
      adminPassword: 'Password123!',
    });
    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error.code).toBe('SETUP_COMPLETED');
  });

  it('authenticates admin and enforces RBAC and password change guard', async () => {
    // Setup first
    await request(app).post('/api/setup').send({
      companyName: 'Acme Corp',
      adminEmail: 'admin@acme.com',
      adminPassword: 'Password123!',
    });

    // Login as Admin
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@acme.com',
      password: 'Password123!',
    });
    expect(loginRes.status).toBe(200);
    const adminToken = loginRes.body.data.token;
    expect(adminToken).toBeDefined();

    // GET /auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('admin@acme.com');
    expect(meRes.body.data.role).toBe('admin');

    // Admin creates HR user
    const createHrRes = await request(app)
      .post('/api/users/hr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Jane HR',
        email: 'hr@acme.com',
        joinDate: '2026-01-01',
        basicSalary: 80000,
      });
    expect(createHrRes.status).toBe(201);
    const tempPassword = createHrRes.body.data.temporaryPassword;
    expect(tempPassword).toBeDefined();

    // HR logs in with temporary password
    const hrLoginRes = await request(app).post('/api/auth/login').send({
      email: 'hr@acme.com',
      password: tempPassword,
    });
    expect(hrLoginRes.status).toBe(200);
    expect(hrLoginRes.body.data.user.mustChangePassword).toBe(true);
    const hrToken = hrLoginRes.body.data.token;

    // HR attempts to access a protected route without changing password -> 403
    const blockedRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    // HR changes password
    const changePassRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        currentPassword: tempPassword,
        newPassword: 'BrandNewPassword123!',
      });
    expect(changePassRes.status).toBe(200);

    // HR logs in with new password
    const hrNewLoginRes = await request(app).post('/api/auth/login').send({
      email: 'hr@acme.com',
      password: 'BrandNewPassword123!',
    });
    expect(hrNewLoginRes.status).toBe(200);
    expect(hrNewLoginRes.body.data.user.mustChangePassword).toBe(false);
    const hrValidToken = hrNewLoginRes.body.data.token;

    // HR can now read settings
    const readSettingsRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${hrValidToken}`);
    expect(readSettingsRes.status).toBe(200);

    // HR cannot write settings (admin only) -> 403
    const forbiddenWriteRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${hrValidToken}`)
      .send({
        graceMinutes: 20,
      });
    expect(forbiddenWriteRes.status).toBe(403);
    expect(forbiddenWriteRes.body.error.code).toBe('FORBIDDEN');
  });
});
