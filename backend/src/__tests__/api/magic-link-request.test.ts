import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';

jest.mock('../../services/email.service', () => ({ sendMagicLinkEmail: jest.fn().mockResolvedValue(undefined) }));

const app = createApp();
const requestLink = (email: string) => request(app).post('/api/v1/auth/magic-link').send({ email, slug: 'test' });
const addTokens = (n: number, data: object) =>
  testPrisma.magicLinkToken.createMany({
    data: Array.from({ length: n }, (_, i) => ({
      email: 'lee@test.com', tenantId: 'test-tenant', token: `t-${i}`, expiresAt: new Date(Date.now() + 60_000), ...data,
    })),
  });

// These used to fall through to the error handler's 500. 400 (not 404) because CloudFront rewrites 404 to index.html.
describe('POST /api/v1/auth/magic-link', () => {
  beforeEach(() =>
    testPrisma.employee.create({
      data: { id: 'emp-1', tenantId: 'test-tenant', name: 'Lee', email: 'lee@test.com', role: 'SERVER', hourlyRate: 15 },
    }));

  it('sends a link to an active employee', async () => {
    const res = await requestLink('Lee@test.com');
    expect(res.status).toBe(200);
  });

  it('rejects an unknown email with 400 and a readable message', async () => {
    const res = await requestLink('nobody@test.com');
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'EMPLOYEE_NOT_FOUND', message: 'No active employee found with that email.' });
  });

  it.each([
    ['email', 3, {}, 'RATE_LIMIT_EMAIL'],
    ['IP', 10, { email: 'other@test.com', ipAddress: '::ffff:127.0.0.1' }, 'RATE_LIMIT_IP'],
  ])('returns 429 when the %s limit is reached', async (_name, n, data, code) => {
    await addTokens(n, data);
    const res = await requestLink('lee@test.com');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe(code);
  });
});
