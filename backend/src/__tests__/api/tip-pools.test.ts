import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';
import { sendTipEmail } from '../../services/email.service';

jest.mock('../../services/email.service', () => ({ sendTipEmail: jest.fn().mockResolvedValue(undefined) }));

const app = createApp();
const DATE = '2026-04-10';

describe('Multiple tip pools on one date', () => {
  let aliceId: string;
  let bobId: string;

  beforeEach(async () => {
    aliceId = (await request(app).post('/api/v1/employees')
      .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 })).body.data.id;
    bobId = (await request(app).post('/api/v1/employees')
      .send({ name: 'Bob', email: 'bob@test.com', role: 'SERVER', hourlyRate: 15 })).body.data.id;
  });

  const entry = (extra: object = {}) => ({
    entryDate: DATE, cashInRegister: 300, cashSales: 0, cashTips: 0, posTips: 100,
    employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 6 }],
    ...extra,
  });
  const create = (extra: object = {}) => request(app).post('/api/v1/tips/entries').send(entry(extra));
  const activeNames = async () =>
    (await testPrisma.tipEntry.findMany({ where: { entryDate: DATE, isDeleted: false } })).map((e: any) => e.poolName).sort();

  describe('creating', () => {
    it('allows a regular pool plus two named events on one date', async () => {
      expect((await create()).status).toBe(201);
      expect((await create({ poolName: 'Smith wedding' })).status).toBe(201);
      expect((await create({ poolName: 'Corporate lunch' })).status).toBe(201);
      expect(await activeNames()).toEqual(['', 'Corporate lunch', 'Smith wedding']);
    });

    it('refuses a blank name when a regular pool exists, asking for an event name', async () => {
      await create();
      const res = await create();
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
      expect(res.body.error.message).toBe(`An entry already exists for ${DATE}. Enter an event name to add a separate tip pool.`);
    });

    it('refuses a repeated name regardless of case and spaces', async () => {
      await create({ poolName: 'Private Event' });
      const res = await create({ poolName: '  private   event ' });
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
      expect(res.body.error.message).toBe(`"private event" already exists for ${DATE}. Use a different name.`);
    });

    it('stores the normalized name', async () => {
      expect((await create({ poolName: '  Smith   wedding ' })).body.data.poolName).toBe('Smith wedding');
    });

    it('treats a name of only spaces as the regular pool', async () => {
      expect((await create({ poolName: '   ' })).body.data.poolName).toBe('');
    });

    it('rejects a name over 60 characters', async () => {
      expect((await create({ poolName: 'x'.repeat(61) })).status).toBe(400);
      expect((await create({ poolName: 'x'.repeat(60) })).status).toBe(201);
    });

    it('allows a regular pool after an event was entered first', async () => {
      await create({ poolName: 'Private event' });
      expect((await create()).status).toBe(201);
    });

    it('allows re-entering a deleted regular pool while an event remains', async () => {
      const regular = await create();
      await create({ poolName: 'Private event' });
      await request(app).delete(`/api/v1/tips/entries/${regular.body.data.id}`);
      expect((await create()).status).toBe(201);
      expect(await activeNames()).toEqual(['', 'Private event']);
    });

    it('lets only one of two simultaneous saves of the same pool succeed', async () => {
      const results = await Promise.all([create({ poolName: 'A' }), create({ poolName: 'A' })]);
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.find((r) => r.status !== 201)!.body.error.code).toBe('DUPLICATE_ENTRY');
      expect(await activeNames()).toEqual(['A']);
    });

    it('records poolName in the audit log', async () => {
      const { id } = (await create({ poolName: 'Private event' })).body.data;
      const audit = await testPrisma.auditLog.findFirst({ where: { entityId: id, action: 'CREATE' } });
      expect(JSON.stringify(audit?.newValues)).toContain('Private event');
    });
  });

  describe('editing a draft', () => {
    it('renames a draft', async () => {
      const { id } = (await create({ poolName: 'Old name' })).body.data;
      const res = await request(app).patch(`/api/v1/tips/entries/${id}`).send(entry({ poolName: 'New name' }));
      expect(res.body.data.poolName).toBe('New name');
      expect(await activeNames()).toEqual(['New name']);
    });

    it('refuses a rename onto an existing pool, leaving the draft unchanged', async () => {
      await create({ poolName: 'Taken' });
      const { id } = (await create({ poolName: 'Mine' })).body.data;
      const res = await request(app).patch(`/api/v1/tips/entries/${id}`).send(entry({ poolName: 'taken' }));
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
      expect(await activeNames()).toEqual(['Mine', 'Taken']);
    });

    it('keeps the name when an edit sends none', async () => {
      const { id } = (await create({ poolName: 'Private event' })).body.data;
      const res = await request(app).patch(`/api/v1/tips/entries/${id}`).send(entry({ posTips: 150 }));
      expect(res.status).toBe(200);
      expect(res.body.data.poolName).toBe('Private event');
    });

    it('allows changing only the capitals of its own name', async () => {
      const { id } = (await create({ poolName: 'private event' })).body.data;
      const res = await request(app).patch(`/api/v1/tips/entries/${id}`).send(entry({ poolName: 'Private Event' }));
      expect(res.body.data.poolName).toBe('Private Event');
    });
  });

  it('passes the pool name to the email when publishing', async () => {
    const { id } = (await create({ poolName: 'Private event' })).body.data;
    await request(app).post(`/api/v1/tips/entries/${id}/publish`);
    expect(sendTipEmail).toHaveBeenLastCalledWith(expect.objectContaining({ poolName: 'Private event' }));
  });

  describe('GET /api/v1/tips/pools', () => {
    const pools = (role = 'SHIFT_LEAD', date = DATE) =>
      request(app).get(`/api/v1/tips/pools?date=${date}`).set('x-test-role', role);

    it('returns name, total and names only, to a shift lead', async () => {
      await create();
      const res = await pools();
      expect(res.status).toBe(200);
      expect(Object.keys(res.body.data[0]).sort()).toEqual(['employees', 'poolName', 'totalTipPool']);
      expect(JSON.stringify(res.body)).not.toMatch(/hourly|wage|totalPay|finalTips|hours/i);
    });

    it('lists the regular pool first with its total and each employee once', async () => {
      await create({ poolName: 'Private event', employees: [{ employeeId: bobId, role: 'SERVER', hoursWorked: 3 }] });
      await create({ employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 6 }, { employeeId: bobId, role: 'SERVER', hoursWorked: 6 }] });
      expect((await pools()).body.data).toEqual([
        { poolName: '', totalTipPool: 400, employees: ['Alice', 'Bob'] },
        { poolName: 'Private event', totalTipPool: 400, employees: ['Bob'] },
      ]);
    });

    it('leaves out deleted pools and other dates', async () => {
      const { id } = (await create()).body.data;
      await create({ entryDate: '2026-04-11' });
      await request(app).delete(`/api/v1/tips/entries/${id}`);
      expect((await pools()).body.data).toEqual([]);
    });

    it("does not return another tenant's pools", async () => {
      await testPrisma.tenant.create({ data: { id: 'other-tenant', name: 'Other', timezone: 'America/New_York' } });
      await testPrisma.tipEntry.create({ data: { tenantId: 'other-tenant', entryDate: DATE, cashInRegister: 999, cashSales: 0, cashTips: 0, posTips: 0 } });
      expect((await pools()).body.data).toEqual([]);
    });

    it('rejects a malformed date', async () => {
      expect((await pools('SHIFT_LEAD', 'yesterday')).status).toBe(400);
    });
  });
});
