import '../setup';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { testPrisma } from '../setup';

// Real JWT auth (the test bypass is disabled whenever a Lambda function name is set).
process.env.AWS_LAMBDA_FUNCTION_NAME = 'auth-cookie-test';
const { createApp } = require('../../app');
const app = createApp();

const login = () => request(app).post('/api/v1/auth/login').set('X-Venue', 'test')
  .send({ slug: 'test', email: 'mgr@test.com', password: 'manager-password' });
const authCookie = (res: request.Response) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('gratify_test='));

describe('httpOnly cookie auth', () => {
  beforeEach(async () => {
    await testPrisma.user.create({
      data: { id: 'mgr', tenantId: 'test-tenant', email: 'mgr@test.com', passwordHash: await bcrypt.hash('manager-password', 4), role: 'MANAGER' },
    });
  });

  it('login puts the JWT only in an HttpOnly, Secure, SameSite=Strict cookie scoped to /api', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.data.jwt).toBeUndefined();
    expect(res.body.data.user).toMatchObject({ sub: 'mgr', role: 'MANAGER', email: 'mgr@test.com', tenantId: 'test-tenant' });
    const cookie = authCookie(res)!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api/);
  });

  it('the login cookie authenticates later requests; no cookie gets 401', async () => {
    const cookie = authCookie(await login())!.split(';')[0];
    expect((await request(app).get('/api/v1/employees').set('X-Venue', 'test').set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).get('/api/v1/employees').set('X-Venue', 'test')).status).toBe(401);
  });

  it('logout expires the cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout').set('X-Venue', 'test');
    expect(res.status).toBe(200);
    expect(authCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});
