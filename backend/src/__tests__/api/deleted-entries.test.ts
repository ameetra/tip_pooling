import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';

const app = createApp();
const REPORT = '/api/v1/tips/deleted-report';

describe('Deleting published entries requires a reason; admins see a report', () => {
  let aliceId: string;
  // Pool = (1300-1000) + 0 + 200 = 500.
  const cash = { cashInRegister: 1300, cashSales: 1000, cashTips: 0, posTips: 200 };

  const createEntry = async (entryDate: string) => {
    const res = await request(app).post('/api/v1/tips/entries')
      .send({ entryDate, ...cash, employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }] });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  // Publish directly in the DB: the publish endpoint would try to send real emails.
  const publish = (id: string) => testPrisma.tipEntry.update({ where: { id }, data: { publishedAt: new Date() } });
  const remove = (id: string, body?: object) => request(app).delete(`/api/v1/tips/entries/${id}`).send(body);

  beforeEach(async () => {
    const alice = await request(app).post('/api/v1/employees')
      .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });
    aliceId = alice.body.data.id;
  });

  describe('DELETE /tips/entries/:id', () => {
    it('rejects deleting a published entry without a reason and keeps it', async () => {
      const id = await createEntry('2026-04-10');
      await publish(id);

      const res = await remove(id);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('REASON_REQUIRED');
      expect((await remove(id, { reason: 'WRONG_HOURS' })).status).toBe(400);
      expect((await remove(id, { reason: 'WRONG_HOURS', note: '   ' })).status).toBe(400);
      expect((await testPrisma.tipEntry.findUnique({ where: { id } }))!.isDeleted).toBe(false);
    });

    it('rejects an unknown reason', async () => {
      const id = await createEntry('2026-04-10');
      await publish(id);
      expect((await remove(id, { reason: 'BAD_MOOD', note: 'x' })).status).toBe(400);
    });

    it('stores who deleted it, the reason and the note, and audit-logs the reason', async () => {
      const id = await createEntry('2026-04-10');
      await publish(id);

      expect((await remove(id, { reason: 'WRONG_HOURS', note: '  Alice worked 6h not 8h ' })).status).toBe(204);

      const entry = await testPrisma.tipEntry.findUnique({ where: { id } });
      expect(entry).toMatchObject({
        isDeleted: true, deletedByEmail: 'test@example.com', deleteReason: 'WRONG_HOURS', deleteNote: 'Alice worked 6h not 8h',
      });
      const audit = await testPrisma.auditLog.findFirst({ where: { entityId: id, action: 'DELETE' } });
      expect(JSON.parse(audit!.newValues!)).toMatchObject({ reason: 'WRONG_HOURS', note: 'Alice worked 6h not 8h' });
    });

    it('still deletes a draft without a reason', async () => {
      const id = await createEntry('2026-04-10');
      expect((await remove(id)).status).toBe(204);
      expect((await testPrisma.tipEntry.findUnique({ where: { id } }))!.deleteReason).toBeNull();
    });
  });

  describe('GET /tips/deleted-report', () => {
    // Deletions by other users are written directly: the test auth bypass is always test@example.com.
    const deletedBy = (id: string, email: string, reason: string, deletedAt: string) =>
      testPrisma.tipEntry.update({
        where: { id },
        data: { publishedAt: new Date(), isDeleted: true, deletedAt: new Date(deletedAt), deletedByEmail: email, deleteReason: reason, deleteNote: 'oops' },
      });

    it('lists deleted published entries in range with per-user counts, newest deletion first', async () => {
      await deletedBy(await createEntry('2026-04-10'), 'sam@test.com', 'WRONG_HOURS', '2026-04-11T12:00:00Z');
      await deletedBy(await createEntry('2026-04-12'), 'sam@test.com', 'WRONG_TIPS', '2026-04-13T12:00:00Z');
      await deletedBy(await createEntry('2026-04-14'), 'sam@test.com', 'WRONG_HOURS', '2026-04-15T12:00:00Z');
      await deletedBy(await createEntry('2026-04-16'), 'kim@test.com', 'OTHER', '2026-04-17T12:00:00Z');
      await deletedBy(await createEntry('2026-03-01'), 'kim@test.com', 'OTHER', '2026-03-02T12:00:00Z'); // out of range

      const res = await request(app).get(`${REPORT}?start_date=2026-04-01&end_date=2026-04-30`);

      expect(res.status).toBe(200);
      expect(res.body.data.entries.map((e: any) => e.entryDate)).toEqual(['2026-04-16', '2026-04-14', '2026-04-12', '2026-04-10']);
      expect(res.body.data.entries[0]).toMatchObject({
        entryDate: '2026-04-16', deletedByEmail: 'kim@test.com', deleteReason: 'OTHER', deleteNote: 'oops', totalTipPool: 500,
      });
      expect(res.body.data.byUser).toEqual([
        { email: 'sam@test.com', count: 3, reasons: { WRONG_HOURS: 2, WRONG_TIPS: 1 } },
        { email: 'kim@test.com', count: 1, reasons: { OTHER: 1 } },
      ]);
    });

    it('filters by when the entry was deleted, not the entry date', async () => {
      await deletedBy(await createEntry('2026-03-30'), 'sam@test.com', 'WRONG_DATE', '2026-04-02T12:00:00Z');
      const res = await request(app).get(`${REPORT}?start_date=2026-04-01&end_date=2026-04-30`);
      expect(res.body.data.entries.map((e: any) => e.entryDate)).toEqual(['2026-03-30']);
    });

    it('excludes deleted drafts and drafts replaced by an edit', async () => {
      const today = new Date().toISOString().slice(0, 10);
      await remove(await createEntry('2026-04-10'));
      const edited = await createEntry('2026-04-12');
      await request(app).patch(`/api/v1/tips/entries/${edited}`)
        .send({ posTips: 300, employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }] });

      const res = await request(app).get(`${REPORT}?start_date=${today}&end_date=${today}`);
      expect(res.body.data.entries).toEqual([]);
      expect(res.body.data.byUser).toEqual([]);
    });

    it('never shows another venue\'s deletions', async () => {
      await testPrisma.tenant.create({ data: { id: 'other-tenant', name: 'Other' } });
      await testPrisma.tipEntry.create({
        data: { tenantId: 'other-tenant', entryDate: '2026-04-10', publishedAt: new Date(), isDeleted: true, deletedAt: new Date('2026-04-11T12:00:00Z'), deletedByEmail: 'x@other.com', deleteReason: 'OTHER', deleteNote: 'n' },
      });
      const res = await request(app).get(`${REPORT}?start_date=2026-04-01&end_date=2026-04-30`);
      expect(res.body.data.entries).toEqual([]);
    });

    it('requires start_date and end_date', async () => {
      expect((await request(app).get(REPORT)).status).toBe(400);
    });
  });
});
