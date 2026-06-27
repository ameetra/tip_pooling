import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';

const app = createApp();

describe('Tip Entry API - E2E Workflow', () => {
  let aliceId: string;
  let bobId: string;
  let charlieId: string;

  beforeEach(async () => {
    // Alice is multi-role (server + busser) to exercise per-role rates.
    const alice = await request(app).post('/api/v1/employees')
      .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', rates: [{ role: 'SERVER', hourlyRate: 15 }, { role: 'BUSSER', hourlyRate: 12 }] });
    const bob = await request(app).post('/api/v1/employees')
      .send({ name: 'Bob', email: 'bob@test.com', role: 'SERVER', hourlyRate: 15 });
    const charlie = await request(app).post('/api/v1/employees')
      .send({ name: 'Charlie', email: 'charlie@test.com', role: 'BUSSER', hourlyRate: 12 });
    aliceId = alice.body.data.id;
    bobId = bob.body.data.id;
    charlieId = charlie.body.data.id;

    await request(app).post('/api/v1/config/support-staff').send({ configs: [{ role: 'BUSSER', percentage: 20 }] });
  });

  // (cashInRegister - cashSales) + cashTips + posTips. Here: (1300-1000)+0 + 200 = 500.
  const cash = { cashInRegister: 1300, cashSales: 1000, cashTips: 0, posTips: 200 };

  describe('POST /api/v1/tips/preview', () => {
    it('previews tip calculations (per-employee results)', async () => {
      const res = await request(app).post('/api/v1/tips/preview').send({
        entryDate: '2026-04-10', ...cash,
        employees: [
          { employeeId: aliceId, role: 'SERVER', hoursWorked: 8 },
          { employeeId: bobId, role: 'SERVER', hoursWorked: 6 },
          { employeeId: charlieId, role: 'BUSSER', hoursWorked: 8 },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.data.cashTips).toBe(300);
      expect(res.body.data.totalTipPool).toBe(500);
      expect(res.body.data.results).toHaveLength(3);
      const total = res.body.data.results.reduce((s: number, r: any) => s + r.totalTips, 0);
      expect(total).toBeCloseTo(500, 1);
    });

    it('rejects a negative total tip pool', async () => {
      const res = await request(app).post('/api/v1/tips/preview').send({
        entryDate: '2026-04-10', cashInRegister: 0, cashSales: 100, cashTips: 0, posTips: 0,
        employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }],
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an invalid date format', async () => {
      const res = await request(app).post('/api/v1/tips/preview').send({
        entryDate: '04-10-2026', ...cash,
        employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }],
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a role the employee has no base rate for', async () => {
      const res = await request(app).post('/api/v1/tips/preview').send({
        entryDate: '2026-04-10', ...cash,
        employees: [
          { employeeId: aliceId, role: 'SERVER', hoursWorked: 8 },
          { employeeId: bobId, role: 'BUSSER', hoursWorked: 4 }, // Bob has no busser rate
        ],
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_ROLE_RATE');
    });

    it('supports the same employee in two roles', async () => {
      const res = await request(app).post('/api/v1/tips/preview').send({
        entryDate: '2026-04-10', ...cash,
        employees: [
          { employeeId: aliceId, role: 'SERVER', hoursWorked: 4 },
          { employeeId: aliceId, role: 'BUSSER', hoursWorked: 3 },
          { employeeId: bobId, role: 'SERVER', hoursWorked: 6 },
        ],
      });
      expect(res.status).toBe(200);
      const alice = res.body.data.results.find((r: any) => r.employeeId === aliceId);
      expect(alice.roles.sort()).toEqual(['BUSSER', 'SERVER']);
      expect(alice.totalHours).toBe(7);
    });
  });

  describe('POST /api/v1/tips/entries', () => {
    const makeEntry = (date = '2026-04-10') => ({
      entryDate: date, ...cash,
      employees: [
        { employeeId: aliceId, role: 'SERVER', hoursWorked: 8 },
        { employeeId: bobId, role: 'SERVER', hoursWorked: 6 },
        { employeeId: charlieId, role: 'BUSSER', hoursWorked: 8 },
      ],
    });

    it('creates a tip entry with calculations', async () => {
      const res = await request(app).post('/api/v1/tips/entries').send(makeEntry());
      expect(res.status).toBe(201);
      expect(res.body.data.entryDate).toBe('2026-04-10');
      expect(res.body.data.totalTipPool).toBe(500);
      expect(res.body.data.results).toHaveLength(3);
    });

    it('prevents a duplicate entry for the same date', async () => {
      await request(app).post('/api/v1/tips/entries').send(makeEntry());
      const res = await request(app).post('/api/v1/tips/entries').send(makeEntry());
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });

    it('allows an entry on a different date', async () => {
      await request(app).post('/api/v1/tips/entries').send(makeEntry('2026-04-10'));
      const res = await request(app).post('/api/v1/tips/entries').send(makeEntry('2026-04-11'));
      expect(res.status).toBe(201);
    });

    it('persists one calculation row per stint (multi-role employee)', async () => {
      const res = await request(app).post('/api/v1/tips/entries').send({
        entryDate: '2026-04-12', ...cash,
        employees: [
          { employeeId: aliceId, role: 'SERVER', hoursWorked: 4 },
          { employeeId: aliceId, role: 'BUSSER', hoursWorked: 3 },
          { employeeId: bobId, role: 'SERVER', hoursWorked: 6 },
        ],
      });
      const detail = await request(app).get(`/api/v1/tips/entries/${res.body.data.id}`);
      const aliceRows = detail.body.data.tipCalculations.filter((c: any) => c.employeeId === aliceId);
      expect(aliceRows).toHaveLength(2);
    });
  });

  describe('GET /api/v1/tips/entries/:id', () => {
    it('returns calculations with employee details (no shifts)', async () => {
      const created = await request(app).post('/api/v1/tips/entries').send({
        entryDate: '2026-04-10', cashInRegister: 300, cashSales: 0, cashTips: 0, posTips: 100,
        employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }],
      });
      const res = await request(app).get(`/api/v1/tips/entries/${created.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.tipCalculations).toHaveLength(1);
      expect(res.body.data.tipCalculations[0].employee.name).toBe('Alice');
      expect(res.body.data.tipCalculations[0].shiftAssignments).toBeUndefined();
    });
  });

  describe('DELETE /api/v1/tips/entries/:id', () => {
    it('soft-deletes an entry and frees the date', async () => {
      const entry = {
        entryDate: '2026-04-10', cashInRegister: 300, cashSales: 0, cashTips: 0, posTips: 100,
        employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }],
      };
      const created = await request(app).post('/api/v1/tips/entries').send(entry);
      expect((await request(app).delete(`/api/v1/tips/entries/${created.body.data.id}`)).status).toBe(204);

      const list = await request(app).get('/api/v1/tips/entries');
      expect(list.body.pagination.total).toBe(0);
      expect((await request(app).post('/api/v1/tips/entries').send(entry)).status).toBe(201);
    });
  });

  describe('PATCH /api/v1/tips/entries/:id', () => {
    it('edits by creating new + soft-deleting old with replacedById', async () => {
      const created = await request(app).post('/api/v1/tips/entries').send({
        entryDate: '2026-04-10', cashInRegister: 300, cashSales: 0, cashTips: 0, posTips: 100,
        employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }],
      });
      const oldId = created.body.data.id;

      const res = await request(app).patch(`/api/v1/tips/entries/${oldId}`).send({
        posTips: 200,
        employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }],
      });

      expect(res.status).toBe(200);
      expect(res.body.data.id).not.toBe(oldId);
      expect(res.body.data.totalTipPool).toBe(500); // (300-0)+0 cash + 200 pos

      const oldEntry = await testPrisma.tipEntry.findFirst({ where: { id: oldId } });
      expect(oldEntry!.isDeleted).toBe(true);
      expect(oldEntry!.replacedById).toBe(res.body.data.id);
    });

    it('returns 404 for a nonexistent entry', async () => {
      const res = await request(app).patch('/api/v1/tips/entries/nonexistent').send({
        employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }],
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/tips/entries?force=true', () => {
    it('allows a duplicate entry with the force flag', async () => {
      const entry = {
        entryDate: '2026-04-10', cashInRegister: 300, cashSales: 0, cashTips: 0, posTips: 100,
        employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }],
      };
      await request(app).post('/api/v1/tips/entries').send(entry);
      expect((await request(app).post('/api/v1/tips/entries').send(entry)).status).toBe(400);
      expect((await request(app).post('/api/v1/tips/entries?force=true').send(entry)).status).toBe(201);
    });
  });

  describe('GET /api/v1/tips/entries - pagination & date filtering', () => {
    beforeEach(async () => {
      const make = (date: string) => ({
        entryDate: date, cashInRegister: 300, cashSales: 0, cashTips: 0, posTips: 100,
        employees: [{ employeeId: aliceId, role: 'SERVER', hoursWorked: 8 }],
      });
      await request(app).post('/api/v1/tips/entries').send(make('2026-04-08'));
      await request(app).post('/api/v1/tips/entries').send(make('2026-04-09'));
      await request(app).post('/api/v1/tips/entries').send(make('2026-04-10'));
    });

    it('paginates results', async () => {
      const res = await request(app).get('/api/v1/tips/entries?page=1&limit=2');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toEqual({ page: 1, limit: 2, total: 3 });
    });

    it('filters by date range', async () => {
      const res = await request(app).get('/api/v1/tips/entries?start_date=2026-04-09&end_date=2026-04-10');
      expect(res.body.pagination.total).toBe(2);
    });
  });
});

describe('Support Config API', () => {
  it('returns empty when no config set', async () => {
    const res = await request(app).get('/api/v1/config/support-staff');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('sets support staff config', async () => {
    const res = await request(app).post('/api/v1/config/support-staff')
      .send({ configs: [{ role: 'BUSSER', percentage: 20 }, { role: 'EXPEDITOR', percentage: 15 }] });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(2);
  });

  it('rejects an invalid percentage', async () => {
    const res = await request(app).post('/api/v1/config/support-staff')
      .send({ configs: [{ role: 'BUSSER', percentage: 60 }] });
    expect(res.status).toBe(400);
  });
});
