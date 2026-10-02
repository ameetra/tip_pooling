import '../setup';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';
import { resetAdminPassword } from '../../services/tenant.service';

const app = createApp();
const login = (slug: string, email: string, password: string) => request(app).post('/api/v1/auth/login').send({ slug, email, password });

describe('resetAdminPassword (Lambda admin action)', () => {
  beforeEach(async () => {
    const hash = await bcrypt.hash('old-password', 4);
    await testPrisma.tenant.create({ data: { id: 'other-tenant', name: 'Other Cafe', slug: 'other', logoUrl: 'https://x/other.png' } });
    await testPrisma.tenant.update({ where: { id: 'test-tenant' }, data: { logoUrl: 'https://x/test.png' } });
    await testPrisma.user.createMany({
      data: [
        { id: 'owner-test', tenantId: 'test-tenant', email: 'owner@test.com', passwordHash: hash, role: 'ADMIN' },
        { id: 'owner-other', tenantId: 'other-tenant', email: 'owner@test.com', passwordHash: hash, role: 'ADMIN' },
        { id: 'admin2', tenantId: 'test-tenant', email: 'second@test.com', passwordHash: hash, role: 'ADMIN' },
        { id: 'mgr', tenantId: 'test-tenant', email: 'mgr@test.com', passwordHash: hash, role: 'MANAGER' },
        { id: 'gone', tenantId: 'test-tenant', email: 'gone@test.com', passwordHash: hash, role: 'ADMIN', isActive: false },
      ],
    });
  });

  it('lets a locked-out admin sign in with the temporary password and forces a change', async () => {
    await resetAdminPassword('test', 'Owner@Test.com', 'Temp-pass-123');

    expect((await login('test', 'owner@test.com', 'old-password')).status).toBe(401);
    const res = await login('test', 'owner@test.com', 'Temp-pass-123');
    expect(res.status).toBe(200);
    expect(res.body.data.user.mustChangePassword).toBe(true);

    const audit = await testPrisma.auditLog.findFirst({ where: { entityId: 'owner-test', action: 'PASSWORD_RESET' } });
    expect(audit).not.toBeNull();
    expect(audit!.newValues).not.toContain('Temp-pass-123');
  });

  it('changes nothing else: venue settings, other admins, the same email at another venue', async () => {
    await resetAdminPassword('test', 'owner@test.com', 'Temp-pass-123');

    const tenant = await testPrisma.tenant.findUnique({ where: { id: 'test-tenant' } });
    expect(tenant).toMatchObject({ name: 'Test Restaurant', logoUrl: 'https://x/test.png' });
    expect((await login('other', 'owner@test.com', 'old-password')).status).toBe(200);
    expect((await login('test', 'second@test.com', 'old-password')).status).toBe(200);
  });

  it('refuses unknown venues, non-admins, removed admins and short passwords without creating anyone', async () => {
    await expect(resetAdminPassword('nope', 'owner@test.com', 'Temp-pass-123')).rejects.toThrow('Unknown tenant slug');
    await expect(resetAdminPassword('test', 'new@test.com', 'Temp-pass-123')).rejects.toThrow('No active admin');
    await expect(resetAdminPassword('test', 'mgr@test.com', 'Temp-pass-123')).rejects.toThrow('No active admin');
    await expect(resetAdminPassword('test', 'gone@test.com', 'Temp-pass-123')).rejects.toThrow('No active admin');
    await expect(resetAdminPassword('test', 'owner@test.com', 'short')).rejects.toThrow('at least 8');

    expect(await testPrisma.user.count()).toBe(5);
    expect((await login('test', 'owner@test.com', 'old-password')).status).toBe(200);
  });

  it('is reachable as a Lambda action only with the admin secret', async () => {
    process.env.LAMBDA_ADMIN_SECRET = 'test-secret';
    let handler: any;
    jest.isolateModules(() => { ({ handler } = require('../../lambda')); });
    const event = { action: 'resetAdminPassword', tenantSlug: 'test', email: 'owner@test.com', password: 'Temp-pass-123' };

    expect(await handler({ ...event, secret: 'wrong' }, {})).toEqual({ success: false, error: 'Unauthorized' });
    expect(await handler({ ...event, secret: 'test-secret' }, {})).toEqual({ success: true, tenant: 'test', email: 'owner@test.com' });
    expect(await handler({ ...event, secret: 'test-secret', email: 'mgr@test.com' }, {})).toMatchObject({ success: false });
  });
});
