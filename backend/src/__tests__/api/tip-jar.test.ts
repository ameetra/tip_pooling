import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';
import { setTipJarEnabled } from '../../services/tenant.service';

const app = createApp();
const branding = async () => (await request(app).get('/api/v1/tenants/jarless/branding')).body.data;

describe('Venue tip jar setting', () => {
  beforeEach(() => testPrisma.tenant.create({ data: { id: 'jarless-tenant', name: 'Jarless', slug: 'jarless' } }));

  it('is on by default, so existing venues keep the field', async () => {
    expect(await branding()).toMatchObject({ tipJar: true });
  });

  it('can be turned off and back on for one venue, and audits it', async () => {
    await setTipJarEnabled('jarless', false);
    expect(await branding()).toMatchObject({ tipJar: false });
    expect(await testPrisma.auditLog.count({ where: { tenantId: 'jarless-tenant', entityType: 'TIP_JAR_SETTING', action: 'UPDATE' } })).toBe(1);

    await setTipJarEnabled('jarless', true);
    expect(await branding()).toMatchObject({ tipJar: true });
  });

  it('leaves other venues alone', async () => {
    await testPrisma.tenant.create({ data: { id: 'jar-tenant', name: 'Jar', slug: 'jar' } });
    await setTipJarEnabled('jarless', false);
    expect((await request(app).get('/api/v1/tenants/jar/branding')).body.data).toMatchObject({ tipJar: true });
  });

  it('rejects an unknown venue', async () => {
    await expect(setTipJarEnabled('nope', false)).rejects.toThrow('Unknown tenant slug');
  });
});
