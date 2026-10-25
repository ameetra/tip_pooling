import { testPrisma } from '../setup';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Run real JWT auth + RBAC (the test bypass is disabled whenever a Lambda function name is set).
process.env.AWS_LAMBDA_FUNCTION_NAME = 'barista-role-test';
const { createApp } = require('../../app');
const { setStaffRoles } = require('../../services/tenant.service');
const app = createApp();

const tokenAs = (role: string) =>
  jwt.sign({ sub: 'u1', tenantId: 'test-tenant', role, email: 'u@test.com' }, process.env.JWT_SECRET!, { algorithm: 'HS256' });
const as = (role: string, req: request.Test) => req.set('Cookie', `gratify_test=${tokenAs(role)}`).set('X-Venue', 'test');
const addStaff = (callerRole: string, role: string, email = 'barista@test.com') =>
  as(callerRole, request(app).post('/api/v1/users')).send({ email, password: 'BaristaPass2026', role });

describe('Barista staff role', () => {
  it.each(['SHIFT_LEAD', 'BARISTA'])('%s can open tip entry but not management pages', async (role) => {
    expect((await as(role, request(app).get('/api/v1/employees'))).status).toBe(200);
    expect((await as(role, request(app).get('/api/v1/cash-counts'))).status).toBe(403);
    expect((await as(role, request(app).get('/api/v1/users'))).status).toBe(403);
  });

  it('cannot be assigned at a venue that has not enabled it', async () => {
    const res = await addStaff('ADMIN', 'BARISTA');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ROLE_NOT_ENABLED');
  });

  it('once enabled, managers and admins can add baristas, who sign in as BARISTA', async () => {
    await setStaffRoles('test', ['BARISTA']);
    expect((await addStaff('MANAGER', 'BARISTA')).status).toBe(201);
    expect((await addStaff('ADMIN', 'BARISTA', 'barista2@test.com')).status).toBe(201);

    const listed = await as('MANAGER', request(app).get('/api/v1/users'));
    expect(listed.body.data.map((u: any) => u.role)).toEqual(['BARISTA', 'BARISTA']);

    await testPrisma.user.updateMany({ where: { email: 'barista@test.com' }, data: { mustChangePassword: false } });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'barista@test.com', password: 'BaristaPass2026' });
    expect(login.body.data.user.role).toBe('BARISTA');
  });

  it('venue branding lists the enabled staff roles', async () => {
    expect((await request(app).get('/api/v1/tenants/test/branding')).body.data.staffRoles).toEqual([]);
    await setStaffRoles('test', ['BARISTA']);
    expect((await request(app).get('/api/v1/tenants/test/branding')).body.data.staffRoles).toEqual(['BARISTA']);
  });

  it('setStaffRoles rejects roles that are not opt-in', async () => {
    await expect(setStaffRoles('test', ['MANAGER'])).rejects.toThrow('Unknown staff role(s): MANAGER');
  });
});
