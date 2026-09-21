import '../setup';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { verifyMagicLink } from '../../services/auth.service';
import { testPrisma } from '../setup';

describe('employee magic-link login token', () => {
  // A job role like SHIFT_LEAD is also a staff permission role; it must never leak into the login token.
  it.each(['SHIFT_LEAD', 'SERVER', 'BUSSER', 'EXPEDITOR'])('signs a %s employee in as EMPLOYEE', async (jobRole) => {
    await testPrisma.employee.create({
      data: { id: 'emp-1', tenantId: 'test-tenant', name: 'Lee', email: 'lee@test.com', role: jobRole, hourlyRate: 15 },
    });
    const rawToken = `raw-token-${jobRole}`;
    await testPrisma.magicLinkToken.create({
      data: {
        email: 'lee@test.com', tenantId: 'test-tenant',
        token: crypto.createHash('sha256').update(rawToken).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const { jwt: token } = await verifyMagicLink(rawToken);
    const payload = jwt.decode(token) as { sub: string; role: string; tenantId: string };

    expect(payload.role).toBe('EMPLOYEE');
    expect(payload.sub).toBe('emp-1');
    expect(payload.tenantId).toBe('test-tenant');
  });
});
