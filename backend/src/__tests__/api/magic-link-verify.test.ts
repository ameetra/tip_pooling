import '../setup';
import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';

const app = createApp();

describe('GET /api/v1/auth/verify', () => {
  const addToken = (rawToken: string, data: object = {}) =>
    testPrisma.magicLinkToken.create({
      data: {
        email: 'lee@test.com', tenantId: 'test-tenant',
        token: crypto.createHash('sha256').update(rawToken).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
        ...data,
      },
    });
  const verify = (rawToken: string) => request(app).get(`/api/v1/auth/verify?token=${rawToken}`);

  it.each([
    ['used', 'TOKEN_USED', 'This sign-in link has already been used. Request a new one to sign in.', { isUsed: true, usedAt: new Date() }],
    ['expired', 'TOKEN_EXPIRED', 'This sign-in link has expired. Request a new one to sign in.', { expiresAt: new Date(Date.now() - 60_000) }],
  ])('explains a %s link', async (name, code, message, data) => {
    await addToken(name, data);
    const res = await verify(name);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code, message });
  });

  it('explains an unknown link', async () => {
    const res = await verify('never-issued');
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'INVALID_TOKEN', message: 'This sign-in link is not valid. Request a new one to sign in.' });
  });

  it('still signs in with a valid link, and refuses it the second time', async () => {
    await testPrisma.employee.create({
      data: { tenantId: 'test-tenant', name: 'Lee', email: 'lee@test.com', role: 'SERVER', hourlyRate: 15 },
    });
    await addToken('fresh');
    expect((await verify('fresh')).status).toBe(200);
    expect((await verify('fresh')).body.error.code).toBe('TOKEN_USED');
  });
});
