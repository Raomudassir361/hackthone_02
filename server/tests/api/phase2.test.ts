import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { SettingsModel, DepartmentModel, DesignationModel } from '../../src/modules/org/org.model.js';
import { EmployeeModel, CounterModel } from '../../src/modules/employees/employee.model.js';

describe('Phase 2 Employees & Data Scope Tests', () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  let adminToken: string;
  let hrToken: string;
  let empToken1: string;
  let empId1: string;
  let empId2: string;
  let deptId: string;
  let desigId: string;

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

    // 1. Setup Admin
    await request(app).post('/api/setup').send({
      companyName: 'Acme Test Corp',
      adminEmail: 'admin@acme.com',
      adminPassword: 'Password123!',
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@acme.com',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.token;

    // 2. Create Dept & Desig
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

    // 3. Create HR
    const hrRes = await request(app)
      .post('/api/users/hr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Jane HR',
        email: 'hr@acme.com',
        joinDate: '2026-01-01',
        basicSalary: 90000,
      });
    const hrTempPass = hrRes.body.data.temporaryPassword;

    // Change HR password
    const hrInitLogin = await request(app).post('/api/auth/login').send({
      email: 'hr@acme.com',
      password: hrTempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${hrInitLogin.body.data.token}`)
      .send({ currentPassword: hrTempPass, newPassword: 'NewHrPassword123!' });

    const hrFinalLogin = await request(app).post('/api/auth/login').send({
      email: 'hr@acme.com',
      password: 'NewHrPassword123!',
    });
    hrToken = hrFinalLogin.body.data.token;

    // 4. HR creates Employee 1
    const emp1Res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Alice Smith',
        email: 'alice@acme.com',
        departmentId: deptId,
        designationId: desigId,
        joinDate: '2026-02-01',
        basicSalary: 60000,
      });
    empId1 = emp1Res.body.data.employee.id;
    const emp1TempPass = emp1Res.body.data.temporaryPassword;

    // 5. HR creates Employee 2
    const emp2Res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Bob Jones',
        email: 'bob@acme.com',
        departmentId: deptId,
        designationId: desigId,
        joinDate: '2026-02-15',
        basicSalary: 70000,
      });
    empId2 = emp2Res.body.data.employee.id;

    // Login Employee 1
    const emp1InitLogin = await request(app).post('/api/auth/login').send({
      email: 'alice@acme.com',
      password: emp1TempPass,
    });
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${emp1InitLogin.body.data.token}`)
      .send({ currentPassword: emp1TempPass, newPassword: 'NewEmpPassword123!' });

    const emp1FinalLogin = await request(app).post('/api/auth/login').send({
      email: 'alice@acme.com',
      password: 'NewEmpPassword123!',
    });
    empToken1 = emp1FinalLogin.body.data.token;
  });

  it('generates sequential employee codes EMP-0001 and EMP-0002', async () => {
    const emp1 = await EmployeeModel.findById(empId1);
    const emp2 = await EmployeeModel.findById(empId2);
    // HR is created first (EMP-0001), Alice is EMP-0002, Bob is EMP-0003
    expect(emp1?.code).toBe('EMP-0002');
    expect(emp2?.code).toBe('EMP-0003');
  });

  it('enforces data scope: Employee fetching another employee ID returns 404', async () => {
    // Alice accesses her own profile -> 200
    const ownRes = await request(app)
      .get(`/api/employees/${empId1}`)
      .set('Authorization', `Bearer ${empToken1}`);
    expect(ownRes.status).toBe(200);
    expect(ownRes.body.data.name).toBe('Alice Smith');

    // Alice attempts to access Bob Jones's record -> 404 (NOT 403, per rules.md to prevent existence leak)
    const crossAccessRes = await request(app)
      .get(`/api/employees/${empId2}`)
      .set('Authorization', `Bearer ${empToken1}`);
    expect(crossAccessRes.status).toBe(404);
  });

  it('allows self-service profile update for phone and address only', async () => {
    const updateRes = await request(app)
      .patch('/api/me/profile')
      .set('Authorization', `Bearer ${empToken1}`)
      .send({
        phone: '+92 300 9876543',
        address: '123 Tech Lane, Karachi',
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.phone).toBe('+92 300 9876543');
    expect(updateRes.body.data.address).toBe('123 Tech Lane, Karachi');
  });

  it('enforces salary access: HR can update salary but nobody can update own salary', async () => {
    // HR updates Alice's salary -> 200
    const hrSalaryUpdate = await request(app)
      .put(`/api/employees/${empId1}/salary`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ basicSalary: 65000 });
    expect(hrSalaryUpdate.status).toBe(200);
    expect(hrSalaryUpdate.body.data.basic).toBe(65000);
    expect(hrSalaryUpdate.body.data.gross).toBe(97500); // 1.5 * 65000

    // HR attempts to update their own salary -> 403
    const hrMe = await UserModel.findOne({ email: 'hr@acme.com' });
    const hrEmpId = hrMe?.employeeId?.toString();
    const ownSalaryUpdate = await request(app)
      .put(`/api/employees/${hrEmpId}/salary`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ basicSalary: 120000 });
    expect(ownSalaryUpdate.status).toBe(403);
  });

  it('handles CSV import with dryRun validation and reports exact row errors', async () => {
    const csvData = [
      'name,email,department,designation,joinDate,basicSalary',
      'Valid User,valid@acme.com,Engineering,Software Engineer,2026-03-01,75000',
      'Bad Email,invalid-email,Engineering,Software Engineer,2026-03-01,75000',
      'Unknown Dept,test2@acme.com,NonExistentDept,Software Engineer,2026-03-01,75000',
    ].join('\n');

    // Dry Run
    const dryRunRes = await request(app)
      .post('/api/employees/import?dryRun=true')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ csvContent: csvData });

    expect(dryRunRes.status).toBe(200);
    expect(dryRunRes.body.data.dryRun).toBe(true);
    expect(dryRunRes.body.data.validCount).toBe(1);
    expect(dryRunRes.body.data.errorCount).toBe(2);

    // Verify error detail format: row + field + reason
    const errors = dryRunRes.body.data.errors;
    expect(errors.some((e: { field: string }) => e.field === 'email')).toBe(true);
    expect(errors.some((e: { field: string }) => e.field === 'department')).toBe(true);
  });
});
