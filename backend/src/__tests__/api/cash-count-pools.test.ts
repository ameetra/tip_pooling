import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';
import { todayIn } from '../../services/effective-date';

const app = createApp();

const daysAgo = (n: number) => {
  const d = new Date(`${todayIn('America/Los_Angeles')}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

const day = daysAgo(2);
const EVENT = 'Private event';

const addPool = (cashInRegister: number, poolName = '') =>
  testPrisma.tipEntry.create({ data: { tenantId: 'test-tenant', entryDate: day, cashInRegister, poolName } });
const count = (poolName: string, body: object = {}) =>
  request(app).post('/api/v1/cash-counts').send({ entryDate: day, poolName, ...body });
const rows = async (query = '') => (await request(app).get(`/api/v1/cash-counts${query}`)).body.data;
const rowFor = async (poolName: string) => (await rows()).find((r: any) => r.poolName === poolName);

describe('Cash counts with several tip pools on one date', () => {
  it('lists one row per pool with its own expected amount', async () => {
    await addPool(300);
    await addPool(120, EVENT);
    expect((await rows()).map((r: any) => [r.poolName, r.currentExpected, r.status])).toEqual([
      ['', 300, 'NOT_COUNTED'],
      [EVENT, 120, 'NOT_COUNTED'],
    ]);
  });

  it('counts each pool separately', async () => {
    await addPool(300);
    await addPool(120, EVENT);
    const res = await count(EVENT, { bills100: 1, bills20: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ poolName: EVENT, expectedAmount: 120, countedTotal: 120 });
    expect(await rowFor('')).toMatchObject({ status: 'NOT_COUNTED', count: null });
    expect(await rowFor(EVENT)).toMatchObject({ status: 'MATCHES', variance: 0 });
  });

  it('refuses a second count for the same pool, ignoring capitals, but not for another pool', async () => {
    await addPool(300);
    await addPool(120, EVENT);
    await count(EVENT);
    const res = await count('PRIVATE EVENT');
    expect(res.body.error.code).toBe('ALREADY_COUNTED');
    expect((await count('')).status).toBe(201);
  });

  it('refuses a count for a pool with no entry', async () => {
    await addPool(300);
    expect((await count(EVENT)).body.error.code).toBe('NO_TIP_ENTRY');
  });

  it('keeps an existing regular count working when no pool name is sent', async () => {
    await addPool(300);
    const res = await request(app).post('/api/v1/cash-counts').send({ entryDate: day, bills100: 3 });
    expect(res.body.data).toMatchObject({ poolName: '', expectedAmount: 300, countedTotal: 300 });
  });

  it('reconnects a count when an entry is re-entered under the same name', async () => {
    const old = await addPool(120, EVENT);
    await count(EVENT, { bills100: 1, bills20: 1 });
    await testPrisma.tipEntry.update({ where: { id: old.id }, data: { isDeleted: true, deletedAt: new Date() } });
    await addPool(130, EVENT);
    expect(await rowFor(EVENT)).toMatchObject({ noEntry: false, entryChanged: true, currentExpected: 130 });
  });

  it('flags No tip entry when re-entered under a different name', async () => {
    const old = await addPool(120, EVENT);
    await count(EVENT);
    await testPrisma.tipEntry.update({ where: { id: old.id }, data: { isDeleted: true, deletedAt: new Date() } });
    await addPool(120, 'Renamed');
    expect(await rowFor(EVENT)).toMatchObject({ noEntry: true });
    expect(await rowFor('Renamed')).toMatchObject({ status: 'NOT_COUNTED' });
  });

  it('hides a named pool with $0 cash and no count', async () => {
    await addPool(0, EVENT);
    expect(await rows()).toEqual([]);
  });

  it('shows a named pool with $0 cash once it has a count', async () => {
    await addPool(0, EVENT);
    await count(EVENT);
    expect(await rowFor(EVENT)).toMatchObject({ status: 'MATCHES' });
  });

  it('still shows a regular day with $0 cash', async () => {
    await addPool(0);
    expect(await rowFor('')).toMatchObject({ status: 'NOT_COUNTED' });
  });

  it('shows only the matching pool under a deposit filter', async () => {
    await addPool(300);
    await addPool(120, EVENT);
    await count('', { deposit: 'A1' });
    await count(EVENT, { deposit: 'B2' });
    expect((await rows('?deposit=B2')).map((r: any) => r.poolName)).toEqual([EVENT]);
  });

  it('leaves out an uncounted pool on the same date under a deposit filter', async () => {
    await addPool(300);
    await addPool(120, EVENT);
    await count(EVENT, { deposit: 'B2' });
    expect((await rows('?deposit=B2')).map((r: any) => r.poolName)).toEqual([EVENT]);
  });

  it('recounts a named pool against its own expected amount, keeping the old version', async () => {
    const old = await addPool(120, EVENT);
    await addPool(300);
    const { id } = (await count(EVENT)).body.data;
    await testPrisma.tipEntry.update({ where: { id: old.id }, data: { cashInRegister: 150 } });

    const res = await request(app).put(`/api/v1/cash-counts/${id}`).send({ bills100: 1, bills50: 1 });

    expect(res.body.data).toMatchObject({ poolName: EVENT, expectedAmount: 150, countedTotal: 150 });
    expect((await testPrisma.cashCount.findUnique({ where: { id } }))!.isDeleted).toBe(true);
    expect(await rowFor(EVENT)).toMatchObject({ status: 'MATCHES', entryChanged: false });
  });

  it('records the pool in the audit log', async () => {
    await addPool(120, EVENT);
    const { id } = (await count(EVENT)).body.data;
    const audit = await testPrisma.auditLog.findFirst({ where: { entityId: id, action: 'CREATE' } });
    expect(JSON.stringify(audit?.newValues)).toContain(EVENT);
  });
});
