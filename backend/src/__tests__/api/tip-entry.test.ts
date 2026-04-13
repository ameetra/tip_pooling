import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';

const app = createApp();

describe('Tip Entry API - E2E Workflow', () => {
  let aliceId: string;
  let bobId: string;
  let charlieId: string;
  let morningId: string;
  let eveningId: string;

  beforeEach(async () => {
    // Create shifts
    const morning = await request(app).post('/api/v1/shifts').send({ name: 'Morning' });
    const evening = await request(app).post('/api/v1/shifts').send({ name: 'Evening' });
    morningId = morning.body.data.id;
    eveningId = evening.body.data.id;

    // Create employees
    const alice = await request(app)
      .post('/api/v1/employees')
      .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });
    const bob = await request(app)
      .post('/api/v1/employees')
      .send({ name: 'Bob', email: 'bob@test.com', role: 'SERVER', hourlyRate: 15 });
    const charlie = await request(app)
      .post('/api/v1/employees')
      .send({ name: 'Charlie', email: 'charlie@test.com', role: 'BUSSER', hourlyRate: 12 });
    aliceId = alice.body.data.id;
    bobId = bob.body.data.id;
    charlieId = charlie.body.data.id;

    // Set support staff config
    await request(app)
      .post('/api/v1/config/support-staff')
      .send({ configs: [{ role: 'BUSSER', percentage: 20 }] });
  });

  describe('POST /api/v1/tips/preview', () => {
    it('should preview tip calculations', async () => {
      const res = await request(app)
        .post('/api/v1/tips/preview')
        .send({
          entryDate: '2026-04-10',
          startingDrawer: 500,
          closingDrawer: 1800,
          cashSales: 1000,
          electronicTips: 200,
          employees: [
            { employeeId: aliceId, roleOnDay: 'SERVER', hoursWorked: 8, shiftIds: [morningId] },
            { employeeId: bobId, roleOnDay: 'SERVER', hoursWorked: 6, shiftIds: [morningId] },
            { employeeId: charlieId, roleOnDay: 'BUSSER', hoursWorked: 8, shiftIds: [morningId] },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cashTips).toBe(300);
      expect(res.body.data.totalTipPool).toBe(500);
      expect(res.body.data.results).toHaveLength(3);

      // Verify total distributed equals tip pool
      const totalDistributed = res.body.data.results.reduce(
        (sum: number, r: any) => sum + r.finalTips, 0,
      );
      expect(totalDistributed).toBeCloseTo(500, 1);
    });

    it('should reject invalid date format', async () => {
      const res = await request(app)
        .post('/api/v1/tips/preview')
        .send({
          entryDate: '04-10-2026',
          startingDrawer: 500,
          closingDrawer: 800,
          employees: [
            { employeeId: aliceId, roleOnDay: 'SERVER', hoursWorked: 8, shiftIds: [morningId] },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/tips/entries', () => {
    const makeEntry = (date = '2026-04-10') => ({
      entryDate: date,
      startingDrawer: 500,
      closingDrawer: 1800,
      cashSales: 1000,
      electronicTips: 200,
      employees: [
        { employeeId: aliceId, roleOnDay: 'SERVER', hoursWorked: 8, shiftIds: [morningId] },
        { employeeId: bobId, roleOnDay: 'SERVER', hoursWorked: 6, shiftIds: [eveningId] },
        { employeeId: charlieId, roleOnDay: 'BUSSER', hoursWorked: 8, shiftIds: [morningId, eveningId] },
      ],
    });

    it('should create a tip entry with calculations', async () => {
      const res = await request(app)
        .post('/api/v1/tips/entries')
        .send(makeEntry());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.entryDate).toBe('2026-04-10');
      expect(res.body.data.totalTipPool).toBe(500);
      expect(res.body.data.results).toHaveLength(3);
    });

    it('should prevent duplicate entry for same date', async () => {
      await request(app).post('/api/v1/tips/entries').send(makeEntry());
      const res = await request(app).post('/api/v1/tips/entries').send(makeEntry());

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });

    it('should allow entry on different date', async () => {
      await request(app).post('/api/v1/tips/entries').send(makeEntry('2026-04-10'));
      const res = await request(app).post('/api/v1/tips/entries').send(makeEntry('2026-04-11'));

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/v1/tips/entries', () => {
    it('should list active entries', async () => {
      await request(app).post('/api/v1/tips/entries').send({
        entryDate: '2026-04-10',
        startingDrawer: 500, closingDrawer: 800, cashSales: 0, electronicTips: 100,
        employees: [{ employeeId: aliceId, roleOnDay: 'SERVER', hoursWorked: 8, shiftIds: [morningId] }],
      });

      const res = await request(app).get('/api/v1/tips/entries');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/tips/entries/:id', () => {
    it('should get entry with calculations and employee details', async () => {
      const created = await request(app).post('/api/v1/tips/entries').send({
        entryDate: '2026-04-10',
        startingDrawer: 500, closingDrawer: 800, cashSales: 0, electronicTips: 100,
        employees: [
          { employeeId: aliceId, roleOnDay: 'SERVER', hoursWorked: 8, shiftIds: [morningId] },
        ],
      });

      const res = await request(app).get(`/api/v1/tips/entries/${created.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tipCalculations).toHaveLength(1);
      expect(res.body.data.tipCalculations[0].employee.name).toBe('Alice');
      expect(res.body.data.tipCalculations[0].shiftAssignments).toHaveLength(1);
      expect(res.body.data.tipCalculations[0].shiftAssignments[0].shift.name).toBe('Morning');
    });
  });

  describe('DELETE /api/v1/tips/entries/:id', () => {
    it('should soft delete entry', async () => {
      const created = await request(app).post('/api/v1/tips/entries').send({
        entryDate: '2026-04-10',
        startingDrawer: 500, closingDrawer: 800, cashSales: 0, electronicTips: 100,
        employees: [
          { employeeId: aliceId, roleOnDay: 'SERVER', hoursWorked: 8, shiftIds: [morningId] },
        ],
      });

      const deleteRes = await request(app).delete(`/api/v1/tips/entries/${created.body.data.id}`);
      expect(deleteRes.status).toBe(204);

      // Should not appear in list
      const list = await request(app).get('/api/v1/tips/entries');
      expect(list.body.data).toHaveLength(0);

      // Should allow new entry on same date after deletion
      const newEntry = await request(app).post('/api/v1/tips/entries').send({
        entryDate: '2026-04-10',
        startingDrawer: 500, closingDrawer: 800, cashSales: 0, electronicTips: 100,
        employees: [
          { employeeId: aliceId, roleOnDay: 'SERVER', hoursWorked: 8, shiftIds: [morningId] },
        ],
      });
      expect(newEntry.status).toBe(201);
    });
  });
});

describe('Support Config API', () => {
  describe('GET /api/v1/config/support-staff', () => {
    it('should return empty when no config set', async () => {
      const res = await request(app).get('/api/v1/config/support-staff');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('POST /api/v1/config/support-staff', () => {
    it('should set support staff config', async () => {
      const res = await request(app)
        .post('/api/v1/config/support-staff')
        .send({ configs: [{ role: 'BUSSER', percentage: 20 }, { role: 'EXPEDITOR', percentage: 15 }] });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveLength(2);

      const get = await request(app).get('/api/v1/config/support-staff');
      expect(get.body.data).toHaveLength(2);
    });

    it('should reject invalid percentage', async () => {
      const res = await request(app)
        .post('/api/v1/config/support-staff')
        .send({ configs: [{ role: 'BUSSER', percentage: 60 }] });

      expect(res.status).toBe(400);
    });
  });
});
