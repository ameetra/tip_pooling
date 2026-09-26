import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';
import { setRoleLabels, getRoleLabels } from '../../services/tenant.service';

const app = createApp();
const EMPLOYEE_ID = 'test-user';

describe('venue role names', () => {
  it('shows a coffee shop "Server" as "Barista" in branding and tip history', async () => {
    await setRoleLabels('test', { SERVER: 'Barista' });
    await testPrisma.employee.create({
      data: { id: EMPLOYEE_ID, tenantId: 'test-tenant', name: 'Test Barista', email: 'barista@test.com', role: 'SERVER', hourlyRate: 11 },
    });
    const entryDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const created = await request(app).post('/api/v1/tips/entries').send({
      entryDate, cashInRegister: 0, cashSales: 0, cashTips: 0, posTips: 100,
      employees: [{ employeeId: EMPLOYEE_ID, role: 'SERVER', hoursWorked: 6 }],
    });
    await testPrisma.tipEntry.update({ where: { id: created.body.data.id }, data: { publishedAt: new Date() } });

    const branding = await request(app).get('/api/v1/tenants/test/branding');
    const history = await request(app).get('/api/v1/tips/my-history');

    expect(branding.body.data.roleLabels).toEqual({ SERVER: 'Barista' });
    expect(history.body.data.records[0].role).toBe('Barista');
    expect(history.body.data.records[0].tips).toBe(100);
  });

  it('keeps the default names when a venue has none', async () => {
    const branding = await request(app).get('/api/v1/tenants/test/branding');
    expect(branding.body.data.roleLabels).toEqual({});
  });

  it('rejects a role that does not exist', async () => {
    await expect(setRoleLabels('test', { BARISTA: 'Barista' })).rejects.toThrow('Unknown role(s): BARISTA');
  });

  it('drops blank names and resets to defaults with an empty set', async () => {
    expect(await setRoleLabels('test', { SERVER: ' Barista ', BUSSER: '  ' })).toEqual({ SERVER: 'Barista' });
    await setRoleLabels('test', {});
    expect(await getRoleLabels('test-tenant')).toEqual({});
  });
});
