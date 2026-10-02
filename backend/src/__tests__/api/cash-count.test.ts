import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';
import { todayIn } from '../../services/effective-date';

const app = createApp();

// Calendar date `n` days before today in the test venue's timezone.
const daysAgo = (n: number) => {
  const d = new Date(`${todayIn('America/Los_Angeles')}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

const addEntry = (entryDate: string, cashInRegister: number, tenantId = 'test-tenant') =>
  testPrisma.tipEntry.create({ data: { tenantId, entryDate, cashInRegister } });

const count = (entryDate: string, body: object = {}) =>
  request(app).post('/api/v1/cash-counts').send({ entryDate, ...body });

const list = (query = '') => request(app).get(`/api/v1/cash-counts${query}`);
const rowFor = (rows: any[], date: string) => rows.find((r) => r.entryDate === date);

describe('Cash Counts API', () => {
  const day = daysAgo(2);

  describe('POST /api/v1/cash-counts', () => {
    it('totals the bills and coins and reports a match', async () => {
      await addEntry(day, 257.46);
      const res = await count(day, { bills50: 1, bills20: 9, bills10: 2, bills1: 7, coins: 0.46, deposit: '3332', comments: 'ok' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ entryDate: day, expectedAmount: 257.46, countedTotal: 257.46, deposit: '3332', comments: 'ok' });
      const row = rowFor((await list()).body.data, day);
      expect(row).toMatchObject({ status: 'MATCHES', variance: 0, entryChanged: false, noEntry: false });
    });

    it('reports a short count with the negative difference (paid-out explained in comments)', async () => {
      await addEntry(day, 143);
      await count(day, { bills20: 2, bills10: 2, bills1: 3, comments: '-80 Electrician' });

      expect(rowFor((await list()).body.data, day)).toMatchObject({ status: 'SHORT', variance: -80 });
    });

    it('reports an over count', async () => {
      await addEntry(day, 60);
      await count(day, { bills20: 3, bills5: 1 });

      expect(rowFor((await list()).body.data, day)).toMatchObject({ status: 'OVER', variance: 5 });
    });

    it('allows a $0 count (missing envelope) as short by the full amount', async () => {
      await addEntry(day, 945);
      const res = await count(day);

      expect(res.status).toBe(201);
      expect(rowFor((await list()).body.data, day)).toMatchObject({ status: 'SHORT', variance: -945 });
    });

    it('records who counted', async () => {
      await addEntry(day, 10);
      const res = await count(day, { bills10: 1 });
      expect(res.body.data.countedByEmail).toBe('test@example.com');

      const audit = await testPrisma.auditLog.findMany({ where: { entityType: 'CASH_COUNT', action: 'CREATE' } });
      expect(audit).toHaveLength(1);
    });

    it('rejects a date with no tip entry', async () => {
      const res = await count(day, { bills20: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_TIP_ENTRY');
    });

    it('rejects a second count for the same date', async () => {
      await addEntry(day, 20);
      await count(day, { bills20: 1 });
      const res = await count(day, { bills20: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ALREADY_COUNTED');
    });

    it.each([
      ['negative bill count', { bills20: -1 }],
      ['fractional bill count', { bills20: 1.5 }],
      ['coins with fractions of a cent', { coins: 0.123 }],
      ['bad date', { entryDate: '10/02/2026' }],
    ])('rejects %s', async (_label, body) => {
      await addEntry(day, 20);
      const res = await count(day, body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/cash-counts/:id', () => {
    it('replaces the count, keeps the old version and audits the change', async () => {
      await addEntry(day, 100);
      const first = (await count(day, { bills20: 4 })).body.data;
      const res = await request(app).put(`/api/v1/cash-counts/${first.id}`).send({ bills20: 5, comments: 'recounted' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ countedTotal: 100, comments: 'recounted' });
      const old = await testPrisma.cashCount.findUnique({ where: { id: first.id } });
      expect(old).toMatchObject({ isDeleted: true, replacedById: res.body.data.id });
      expect(rowFor((await list()).body.data, day)).toMatchObject({ status: 'MATCHES' });
      expect(await testPrisma.auditLog.count({ where: { entityType: 'CASH_COUNT', action: 'UPDATE' } })).toBe(1);
    });

    it('re-snapshots the expected amount so a recount clears "entry changed"', async () => {
      const entry = await addEntry(day, 100);
      const first = (await count(day, { bills20: 5 })).body.data;
      // Correction flow: the tip entry is deleted and entered again with a different Cash in Register.
      await testPrisma.tipEntry.update({ where: { id: entry.id }, data: { isDeleted: true } });
      await addEntry(day, 120);

      expect(rowFor((await list()).body.data, day)).toMatchObject({ entryChanged: true, currentExpected: 120, variance: 0 });

      const res = await request(app).put(`/api/v1/cash-counts/${first.id}`).send({ bills20: 6 });
      expect(res.body.data.expectedAmount).toBe(120);
      expect(rowFor((await list()).body.data, day)).toMatchObject({ entryChanged: false, status: 'MATCHES' });
    });

    it('returns 404 for an unknown count', async () => {
      const res = await request(app).put('/api/v1/cash-counts/nope').send({ bills20: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/cash-counts/:id', () => {
    it('soft-deletes the count so the drop is not counted again', async () => {
      await addEntry(day, 20);
      const c = (await count(day, { bills20: 1 })).body.data;
      const res = await request(app).delete(`/api/v1/cash-counts/${c.id}`);

      expect(res.status).toBe(200);
      expect(await testPrisma.cashCount.findUnique({ where: { id: c.id } })).toMatchObject({ isDeleted: true });
      expect(rowFor((await list()).body.data, day)).toMatchObject({ status: 'NOT_COUNTED', count: null });
      // The date can be counted again
      expect((await count(day, { bills20: 1 })).status).toBe(201);
    });
  });

  describe('GET /api/v1/cash-counts', () => {
    it('lists tip entries in range newest first, counted or not', async () => {
      await addEntry(daysAgo(1), 50);
      await addEntry(daysAgo(3), 70);
      await count(daysAgo(3), { bills50: 1, bills20: 1 });

      const rows = (await list()).body.data;
      expect(rows.map((r: any) => r.entryDate)).toEqual([daysAgo(1), daysAgo(3)]);
      expect(rows[0]).toMatchObject({ status: 'NOT_COUNTED', currentExpected: 50, count: null, variance: null });
    });

    it('flags a count whose tip entry was deleted and not re-entered', async () => {
      const entry = await addEntry(day, 20);
      await count(day, { bills20: 1 });
      await testPrisma.tipEntry.update({ where: { id: entry.id }, data: { isDeleted: true } });

      expect(rowFor((await list()).body.data, day)).toMatchObject({ noEntry: true, currentExpected: null, status: 'MATCHES' });
    });

    it('also lists uncounted drops older than the range, back 60 days, skipping $0 days', async () => {
      await addEntry(daysAgo(30), 100); // uncounted, within 60 days: listed
      await addEntry(daysAgo(31), 0); // nothing to count: hidden
      await addEntry(daysAgo(40), 50); // counted, outside range: hidden
      await count(daysAgo(40), { bills50: 1 });
      await addEntry(daysAgo(70), 100); // beyond 60 days: hidden

      const dates = (await list(`?from=${daysAgo(13)}`)).body.data.map((r: any) => r.entryDate);
      expect(dates).toEqual([daysAgo(30)]);
    });

    it('filters by deposit across any date', async () => {
      await addEntry(daysAgo(1), 20);
      await addEntry(daysAgo(90), 50);
      await addEntry(daysAgo(5), 10);
      await count(daysAgo(1), { bills20: 1, deposit: '5330' });
      await count(daysAgo(90), { bills50: 1, deposit: '5330' });
      await count(daysAgo(5), { bills10: 1, deposit: '7495' });

      const rows = (await list('?deposit=5330')).body.data;
      expect(rows.map((r: any) => r.entryDate)).toEqual([daysAgo(1), daysAgo(90)]);
    });

    it('does not show or change another venue\'s counts', async () => {
      await testPrisma.tenant.create({ data: { id: 'other-tenant', name: 'Other', slug: 'other' } });
      await addEntry(day, 20, 'other-tenant');
      const other = await testPrisma.cashCount.create({
        data: { tenantId: 'other-tenant', entryDate: day, expectedAmount: 20, bills20: 1, countedTotal: 20 },
      });

      expect((await list()).body.data).toEqual([]);
      expect((await request(app).put(`/api/v1/cash-counts/${other.id}`).send({ bills20: 2 })).status).toBe(404);
      expect((await request(app).delete(`/api/v1/cash-counts/${other.id}`)).status).toBe(404);
      expect((await count(day, { bills20: 1 })).body.error.code).toBe('NO_TIP_ENTRY');
    });
  });
});
