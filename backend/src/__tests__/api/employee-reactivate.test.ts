import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';

const app = createApp();

const reactivate = (id: string, body: object) => request(app).post(`/api/v1/employees/${id}/reactivate`).send(body);
const listEmployees = (status?: string) => request(app).get(`/api/v1/employees${status ? `?status=${status}` : ''}`);
const names = (res: request.Response) => res.body.data.map((e: any) => e.name);

describe('Deactivated employees', () => {
  let danaId: string;

  beforeEach(async () => {
    // Dana used to work as a server ($15) and a busser ($12), then was deactivated.
    const dana = await request(app).post('/api/v1/employees').send({
      name: 'Dana', email: 'dana@test.com', role: 'SERVER',
      rates: [{ role: 'SERVER', hourlyRate: 15 }, { role: 'BUSSER', hourlyRate: 12 }],
    });
    danaId = dana.body.data.id;
    await request(app).delete(`/api/v1/employees/${danaId}`);
  });

  describe('listing', () => {
    it('appear under status=inactive and stay out of the default (active) list', async () => {
      expect(names(await listEmployees())).toEqual([]);
      expect(names(await listEmployees('active'))).toEqual([]);
      expect(names(await listEmployees('inactive'))).toEqual(['Dana']);
    });
  });

  describe('POST /api/v1/employees/:id/reactivate', () => {
    it('brings them back with the new role and rates, dropping the old rates but keeping their history', async () => {
      const res = await reactivate(danaId, { role: 'BUSSER', rates: [{ role: 'BUSSER', hourlyRate: 14 }], effectiveDate: '2026-01-01' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ isActive: true, role: 'BUSSER', hourlyRate: 14 });
      expect(res.body.data.roleRates.map((r: any) => [r.role, r.hourlyRate])).toEqual([['BUSSER', 14]]);
      // History is kept: the two original rates plus the new one.
      expect(res.body.data.rateHistory).toHaveLength(3);
      expect(res.body.data.rateHistory.map((h: any) => `${h.role}:${h.hourlyRate}`)).toEqual(expect.arrayContaining(['SERVER:15', 'BUSSER:12', 'BUSSER:14']));

      expect(names(await listEmployees())).toEqual(['Dana']);
      expect(names(await listEmployees('inactive'))).toEqual([]);
    });

    it.each([
      ['no role', { rates: [{ role: 'BUSSER', hourlyRate: 14 }] }],
      ['no rates', { role: 'BUSSER', rates: [] }],
      ['no rate for the chosen role', { role: 'SERVER', rates: [{ role: 'BUSSER', hourlyRate: 14 }] }],
    ])('is refused with %s (nothing carries over from before)', async (_label, body) => {
      const res = await reactivate(danaId, body);

      expect(res.status).toBe(400);
      expect(names(await listEmployees('inactive'))).toEqual(['Dana']);
    });

    it('is refused for an employee who is already active', async () => {
      await reactivate(danaId, { role: 'SERVER', rates: [{ role: 'SERVER', hourlyRate: 16 }] });

      const res = await reactivate(danaId, { role: 'SERVER', rates: [{ role: 'SERVER', hourlyRate: 17 }] });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_ACTIVE');
    });

    it("cannot reactivate another venue's employee", async () => {
      await testPrisma.tenant.create({ data: { id: 'other-tenant', name: 'Other Restaurant' } });
      await testPrisma.employee.create({
        data: { id: 'other-emp', tenantId: 'other-tenant', name: 'Other', email: 'other@x.com', role: 'SERVER', hourlyRate: 20, isActive: false },
      });

      const res = await reactivate('other-emp', { role: 'SERVER', rates: [{ role: 'SERVER', hourlyRate: 20 }] });

      expect(res.status).toBe(404);
    });
  });

  it('a plain edit cannot reactivate someone (it would skip entering the role and rates)', async () => {
    await request(app).patch(`/api/v1/employees/${danaId}`).send({ isActive: true });

    expect(names(await listEmployees())).toEqual([]);
    expect(names(await listEmployees('inactive'))).toEqual(['Dana']);
  });

  describe('after coming back', () => {
    let bobId: string;
    beforeEach(async () => {
      const bob = await request(app).post('/api/v1/employees').send({ name: 'Bob', email: 'bob@test.com', role: 'SERVER', hourlyRate: 15 });
      bobId = bob.body.data.id;
    });

    const previewWith = (danaRole: string) =>
      request(app).post('/api/v1/tips/preview').send({
        entryDate: '2026-09-15', cashInRegister: 0, cashSales: 0, cashTips: 0, posTips: 100,
        employees: [
          { employeeId: bobId, role: 'SERVER', hoursWorked: 4 },
          { employeeId: danaId, role: danaRole, hoursWorked: 4 },
        ],
      });

    it("an old role's rate is not silently reused from her earlier history", async () => {
      await reactivate(danaId, { role: 'BUSSER', rates: [{ role: 'BUSSER', hourlyRate: 14 }], effectiveDate: '2026-01-01' });

      const asServer = await previewWith('SERVER'); // her old $15 server rate must not come back
      expect(asServer.status).toBe(400);
      expect(asServer.body.error.code).toBe('MISSING_ROLE_RATE');

      const asBusser = await previewWith('BUSSER');
      expect(asBusser.status).toBe(200);
      expect(asBusser.body.data.results.find((r: any) => r.name === 'Dana').totalWage).toBe(56); // 4h x the new $14
    });
  });

  describe('adding the same person again', () => {
    it('says they were deactivated and points to the Inactive list', async () => {
      const res = await request(app).post('/api/v1/employees').send({ name: 'Dana', email: 'dana@test.com', role: 'SERVER', hourlyRate: 16 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMPLOYEE_EXISTS');
      expect(res.body.error.message).toMatch(/deactivated.*Inactive list/);
    });

    it('says the email is already taken when the employee is still active', async () => {
      await request(app).post('/api/v1/employees').send({ name: 'Eli', email: 'eli@test.com', role: 'SERVER', hourlyRate: 15 });

      const res = await request(app).post('/api/v1/employees').send({ name: 'Eli 2', email: 'eli@test.com', role: 'SERVER', hourlyRate: 15 });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe('An employee with this email already exists.');
    });
  });
});
