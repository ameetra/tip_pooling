import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';

const app = createApp();

describe('Tenant Isolation', () => {
  const otherTenantId = 'other-tenant';

  beforeEach(async () => {
    // Create a second tenant
    await testPrisma.tenant.create({
      data: { id: otherTenantId, name: 'Other Restaurant', timezone: 'America/New_York' },
    });

    // Seed data for the other tenant directly in DB
    await testPrisma.employee.create({
      data: { id: 'other-emp', tenantId: otherTenantId, name: 'Other Alice', email: 'alice@other.com', role: 'SERVER', hourlyRate: 20 },
    });
    await testPrisma.supportStaffConfig.create({
      data: { tenantId: otherTenantId, role: 'BUSSER', percentage: 10 },
    });
    await testPrisma.tipEntry.create({
      data: { id: 'other-entry', tenantId: otherTenantId, entryDate: '2026-04-10', cashInRegister: 300, cashSales: 0, cashTips: 0, posTips: 100 },
    });
  });

  it('should not list other tenant employees', async () => {
    // Create employee for test-tenant
    await request(app).post('/api/v1/employees')
      .send({ name: 'My Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });

    const res = await request(app).get('/api/v1/employees');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('My Alice');
  });

  it('should not get other tenant employee by id', async () => {
    const res = await request(app).get('/api/v1/employees/other-emp');
    expect(res.status).toBe(404);
  });

  it('should not list other tenant tip entries', async () => {
    const res = await request(app).get('/api/v1/tips/entries');
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });

  it('should not get other tenant tip entry by id', async () => {
    const res = await request(app).get('/api/v1/tips/entries/other-entry');
    expect(res.status).toBe(404);
  });

  it('should not list other tenant support config', async () => {
    const res = await request(app).get('/api/v1/config/support-staff');
    expect(res.body.data).toHaveLength(0);
  });

  it('should not delete other tenant employee', async () => {
    const res = await request(app).delete('/api/v1/employees/other-emp');
    expect(res.status).toBe(404);

    // Verify other tenant employee still exists
    const emp = await testPrisma.employee.findFirst({ where: { id: 'other-emp' } });
    expect(emp!.isActive).toBe(true);
  });
});
