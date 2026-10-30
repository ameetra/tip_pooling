import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';
import { todayIn } from '../../services/effective-date';
import { sendTipEmail } from '../../services/email.service';

jest.mock('../../services/email.service', () => ({ sendTipEmail: jest.fn().mockResolvedValue(undefined) }));

const app = createApp();
const EVENT = 'Private event';

const date = (() => {
  const d = new Date(`${todayIn('America/Los_Angeles')}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 2);
  return d.toISOString().slice(0, 10);
})();

describe('E2E: a regular shift plus an event sharing one employee', () => {
  let ids: Record<string, string>;

  beforeEach(async () => {
    (sendTipEmail as jest.Mock).mockClear();
    ids = {};
    // Carol's id is the test runner's stand-in user, so my-history reads her records.
    await testPrisma.employee.create({
      data: { id: 'test-user', tenantId: 'test-tenant', name: 'Carol', email: 'carol@test.com', role: 'SERVER', hourlyRate: 15 },
    });
    ids.carol = 'test-user';
    for (const name of ['Alice', 'Bob', 'Dan']) {
      const res = await request(app).post('/api/v1/employees')
        .send({ name, email: `${name.toLowerCase()}@test.com`, role: 'SERVER', hourlyRate: 15 });
      ids[name.toLowerCase()] = res.body.data.id;
    }
  });

  const server = (key: string, hoursWorked: number) => ({ employeeId: ids[key], role: 'SERVER', hoursWorked });
  const regular = () => ({
    entryDate: date, cashInRegister: 400, cashSales: 0, cashTips: 0, posTips: 200,
    employees: [server('alice', 6), server('bob', 6), server('carol', 6)],
  });
  const event = (cashInRegister = 120) => ({
    entryDate: date, poolName: EVENT, cashInRegister, cashSales: 0, cashTips: 0, posTips: 200 - cashInRegister,
    employees: [server('carol', 3), server('dan', 3)],
  });
  const save = async (body: object) => {
    const res = await request(app).post('/api/v1/tips/entries').send(body);
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  const publish = (id: string) => request(app).post(`/api/v1/tips/entries/${id}/publish`).expect(200);

  it('keeps both pools separate through emails, history, payroll and cash', async () => {
    // She saves the normal shift, then the warning lists it when she picks the same date.
    await publish(await save(regular()));
    const pools = await request(app).get(`/api/v1/tips/pools?date=${date}`).set('x-test-role', 'BARISTA');
    expect(pools.body.data).toEqual([{ poolName: '', totalTipPool: 600, employees: ['Alice', 'Bob', 'Carol'] }]);

    const blocked = await request(app).post('/api/v1/tips/entries').send({ ...event(), poolName: '' });
    expect(blocked.body.error.code).toBe('DUPLICATE_ENTRY');

    const eventId = await save(event());
    await publish(eventId);

    const carolEmails = (sendTipEmail as jest.Mock).mock.calls.map(([m]) => m).filter((m) => m.employeeEmail === 'carol@test.com');
    expect(carolEmails.map((m) => [m.poolName, m.hours, m.finalTips])).toEqual([['', 6, 200], [EVENT, 3, 100]]);

    const { records } = (await request(app).get('/api/v1/tips/my-history')).body.data;
    expect(records.map((r: any) => [r.poolName, r.hours, r.tips])).toEqual([['', 6, 200], [EVENT, 3, 100]]);

    const payroll = (await request(app).get(`/api/v1/tips/payroll-report?start_date=${date}&end_date=${date}`)).body.data;
    expect(payroll.publishedEntries).toBe(2);
    expect(payroll.totalTips).toBe(800);
    expect(payroll.employees.find((e: any) => e.name === 'Carol')).toMatchObject({ daysWorked: 1, hours: 9, totalTips: 300 });

    const cashRows = (await request(app).get('/api/v1/cash-counts')).body.data;
    expect(cashRows.map((r: any) => [r.poolName, r.currentExpected])).toEqual([['', 400], [EVENT, 120]]);
  });

  it('lets a published event be corrected by delete and re-enter, reconnecting its count', async () => {
    await publish(await save(regular()));
    const eventId = await save(event());
    await publish(eventId);
    await request(app).post('/api/v1/cash-counts').send({ entryDate: date, poolName: EVENT, bills100: 1, bills20: 1 }).expect(201);

    await request(app).delete(`/api/v1/tips/entries/${eventId}`).send({ reason: 'WRONG_TIPS', note: 'Wrong cash' }).expect(204);
    await save(event(150));

    const rows = (await request(app).get('/api/v1/cash-counts')).body.data;
    expect(rows.find((r: any) => r.poolName === EVENT)).toMatchObject({ noEntry: false, entryChanged: true, currentExpected: 150 });
    expect(rows.find((r: any) => r.poolName === '')).toMatchObject({ status: 'NOT_COUNTED' });
    expect((await testPrisma.tipEntry.findMany({ where: { entryDate: date, isDeleted: true } })).map((e) => e.id)).toEqual([eventId]);
  });

  it('can repeat the same event name on another date', async () => {
    await save(event());
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    expect(await save({ ...event(), entryDate: next.toISOString().slice(0, 10) })).toBeTruthy();
  });
});
