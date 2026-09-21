import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';

const app = createApp();
const REPORT = '/api/v1/tips/payroll-report';

describe('Payroll report API', () => {
  let aliceId: string;
  let bobId: string;

  // Pool = (1300-1000) + 0 + 200 = 500.
  const cash = { cashInRegister: 1300, cashSales: 1000, cashTips: 0, posTips: 200 };

  const createEntry = async (entryDate: string, employees: object[]) => {
    const res = await request(app).post('/api/v1/tips/entries').send({ entryDate, ...cash, employees });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  // Publish directly in the DB: the publish endpoint would try to send real emails.
  const publish = (id: string) => testPrisma.tipEntry.update({ where: { id }, data: { publishedAt: new Date() } });

  beforeEach(async () => {
    const alice = await request(app).post('/api/v1/employees')
      .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', rates: [{ role: 'SERVER', hourlyRate: 15 }, { role: 'BUSSER', hourlyRate: 12 }] });
    const bob = await request(app).post('/api/v1/employees')
      .send({ name: 'Bob', email: 'bob@test.com', role: 'SERVER', hourlyRate: 15 });
    aliceId = alice.body.data.id;
    bobId = bob.body.data.id;
    await request(app).post('/api/v1/config/support-staff').send({ configs: [{ role: 'BUSSER', percentage: 20 }] });
  });

  describe('totals', () => {
    it('sums published, in-range, non-deleted entries per employee and lists drafts as excluded', async () => {
      // 04-10: Alice + Bob server 8h each -> 250 / 250
      const a = await createEntry('2026-04-10', [
        { employeeId: aliceId, role: 'SERVER', hoursWorked: 8 },
        { employeeId: bobId, role: 'SERVER', hoursWorked: 8 },
      ]);
      // 04-11: Alice works two roles (4h server + 4h busser), Bob 8h server -> Alice 233.33, Bob 266.67
      const b = await createEntry('2026-04-11', [
        { employeeId: aliceId, role: 'SERVER', hoursWorked: 4 },
        { employeeId: aliceId, role: 'BUSSER', hoursWorked: 4 },
        { employeeId: bobId, role: 'SERVER', hoursWorked: 8 },
      ]);
      const draft = await createEntry('2026-04-12', [{ employeeId: bobId, role: 'SERVER', hoursWorked: 8 }]);
      const deleted = await createEntry('2026-04-13', [{ employeeId: bobId, role: 'SERVER', hoursWorked: 8 }]);
      const outOfRange = await createEntry('2026-05-01', [{ employeeId: bobId, role: 'SERVER', hoursWorked: 8 }]);
      await Promise.all([a, b, deleted, outOfRange].map(publish));
      await request(app).delete(`/api/v1/tips/entries/${deleted}`);

      const res = await request(app).get(`${REPORT}?start_date=2026-04-10&end_date=2026-04-30`);

      expect(res.status).toBe(200);
      const report = res.body.data;
      expect(report.publishedEntries).toBe(2);
      expect(report.employees).toEqual([
        { employeeId: aliceId, name: 'Alice', email: 'alice@test.com', daysWorked: 2, hours: 16, totalTips: 483.33 },
        { employeeId: bobId, name: 'Bob', email: 'bob@test.com', daysWorked: 2, hours: 16, totalTips: 516.67 },
      ]);
      expect(report.totalTips).toBe(1000);
      expect(report.unpublished).toEqual([{ id: draft, entryDate: '2026-04-12' }]);
    });

    it('returns an empty report when nothing is published in the range', async () => {
      await createEntry('2026-04-10', [{ employeeId: bobId, role: 'SERVER', hoursWorked: 8 }]);

      const res = await request(app).get(`${REPORT}?start_date=2026-04-01&end_date=2026-04-30`);

      expect(res.body.data.employees).toEqual([]);
      expect(res.body.data.totalTips).toBe(0);
      expect(res.body.data.unpublished).toHaveLength(1);
    });
  });

  describe('validation', () => {
    it('requires both dates', async () => {
      expect((await request(app).get(`${REPORT}?start_date=2026-04-01`)).status).toBe(400);
      expect((await request(app).get(REPORT)).status).toBe(400);
    });

    it('rejects a start date after the end date', async () => {
      const res = await request(app).get(`${REPORT}?start_date=2026-04-30&end_date=2026-04-01`);
      expect(res.status).toBe(400);
    });

    it('rejects ranges longer than a year', async () => {
      const res = await request(app).get(`${REPORT}?start_date=2025-01-01&end_date=2026-04-01`);
      expect(res.status).toBe(400);
    });
  });

  it("never includes another tenant's published entries", async () => {
    await testPrisma.tenant.create({ data: { id: 'other-tenant', name: 'Other Restaurant' } });
    await testPrisma.employee.create({
      data: { id: 'other-emp', tenantId: 'other-tenant', name: 'Other Alice', email: 'alice@other.com', role: 'SERVER', hourlyRate: 20 },
    });
    await testPrisma.tipEntry.create({
      data: { id: 'other-entry', tenantId: 'other-tenant', entryDate: '2026-04-10', posTips: 100, publishedAt: new Date() },
    });
    await testPrisma.tipCalculation.create({
      data: {
        tipEntryId: 'other-entry', employeeId: 'other-emp', roleOnDay: 'SERVER', totalHours: 8,
        hourlyPay: 160, baseTips: 100, finalTips: 100, totalPay: 260, effectiveHourlyRate: 32.5,
      },
    });

    const res = await request(app).get(`${REPORT}?start_date=2026-04-01&end_date=2026-04-30`);

    expect(res.body.data.employees).toEqual([]);
    expect(res.body.data.publishedEntries).toBe(0);
  });
});
