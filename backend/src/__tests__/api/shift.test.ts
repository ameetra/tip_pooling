import '../setup';
import request from 'supertest';
import { createApp } from '../../app';

const app = createApp();

describe('Shift API', () => {
  describe('POST /api/v1/shifts', () => {
    it('should create a shift', async () => {
      const res = await request(app)
        .post('/api/v1/shifts')
        .send({ name: 'Morning' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Morning');
      expect(res.body.data.isActive).toBe(true);
    });

    it('should enforce max 10 active shifts', async () => {
      for (let i = 1; i <= 10; i++) {
        await request(app).post('/api/v1/shifts').send({ name: `Shift ${i}` });
      }

      const res = await request(app)
        .post('/api/v1/shifts')
        .send({ name: 'Shift 11' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MAX_SHIFTS_EXCEEDED');
    });
  });

  describe('GET /api/v1/shifts', () => {
    it('should list active shifts', async () => {
      await request(app).post('/api/v1/shifts').send({ name: 'Morning' });
      await request(app).post('/api/v1/shifts').send({ name: 'Evening' });

      const res = await request(app).get('/api/v1/shifts');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('DELETE /api/v1/shifts/:id', () => {
    it('should soft delete unused shift', async () => {
      const created = await request(app)
        .post('/api/v1/shifts')
        .send({ name: 'ToDelete' });

      const res = await request(app)
        .delete(`/api/v1/shifts/${created.body.data.id}`);

      expect(res.status).toBe(204);

      const list = await request(app).get('/api/v1/shifts');
      expect(list.body.data).toHaveLength(0);
    });

    it('should prevent deleting shift used in active tip entries', async () => {
      // Create employee + shift
      const emp = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });
      const shift = await request(app)
        .post('/api/v1/shifts')
        .send({ name: 'Morning' });

      // Set up support config
      await request(app)
        .post('/api/v1/config/support-staff')
        .send({ configs: [{ role: 'BUSSER', percentage: 5 }] });

      // Create a tip entry that references this shift
      await request(app)
        .post('/api/v1/tips/entries')
        .send({
          entryDate: '2026-04-10',
          startingDrawer: 500,
          closingDrawer: 800,
          cashSales: 200,
          electronicTips: 50,
          employees: [{
            employeeId: emp.body.data.id,
            roleOnDay: 'SERVER',
            hoursWorked: 8,
            shiftIds: [shift.body.data.id],
          }],
        });

      // Try to delete the shift
      const res = await request(app)
        .delete(`/api/v1/shifts/${shift.body.data.id}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SHIFT_IN_USE');
    });
  });
});
