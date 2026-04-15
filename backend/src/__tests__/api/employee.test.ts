import '../setup';
import request from 'supertest';
import { createApp } from '../../app';

const app = createApp();

describe('Employee API', () => {
  describe('POST /api/v1/employees', () => {
    it('should create an employee', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Alice');
      expect(res.body.data.email).toBe('alice@test.com');
      expect(res.body.data.role).toBe('SERVER');
      expect(res.body.data.hourlyRate).toBe(15);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });

    it('should reject invalid role', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Bad', email: 'bad@test.com', role: 'CHEF', hourlyRate: 15 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
    });

    it('should reject duplicate email for same tenant', async () => {
      await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'dup@test.com', role: 'SERVER', hourlyRate: 15 });

      const res = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice 2', email: 'dup@test.com', role: 'BUSSER', hourlyRate: 12 });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/employees', () => {
    it('should list active employees', async () => {
      await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });
      await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Bob', email: 'bob@test.com', role: 'BUSSER', hourlyRate: 12 });

      const res = await request(app).get('/api/v1/employees');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should filter by search query', async () => {
      await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice Smith', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });
      await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Bob Jones', email: 'bob@test.com', role: 'BUSSER', hourlyRate: 12 });

      const res = await request(app).get('/api/v1/employees?search=Alice');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Alice Smith');
    });
  });

  describe('GET /api/v1/employees/:id', () => {
    it('should get employee by id', async () => {
      const created = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });

      const res = await request(app).get(`/api/v1/employees/${created.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Alice');
    });

    it('should return 404 for unknown id', async () => {
      const res = await request(app).get('/api/v1/employees/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/employees/:id', () => {
    it('should update employee name', async () => {
      const created = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });

      const res = await request(app)
        .patch(`/api/v1/employees/${created.body.data.id}`)
        .send({ name: 'Alice Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Alice Updated');
    });
  });

  describe('POST /api/v1/employees/:id/update-rate', () => {
    it('should update rate and add history entry', async () => {
      const created = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });

      const res = await request(app)
        .post(`/api/v1/employees/${created.body.data.id}/update-rate`)
        .send({ hourlyRate: 20 });

      expect(res.status).toBe(200);
      expect(res.body.data.hourlyRate).toBe(20);
      expect(res.body.data.rateHistory).toHaveLength(2);
      expect(res.body.data.rateHistory[0].hourlyRate).toBe(20);
      expect(res.body.data.rateHistory[1].hourlyRate).toBe(15);
    });

    it('should accept custom effectiveDate', async () => {
      const created = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Bob', email: 'bob@test.com', role: 'SERVER', hourlyRate: 12 });

      const res = await request(app)
        .post(`/api/v1/employees/${created.body.data.id}/update-rate`)
        .send({ hourlyRate: 15, effectiveDate: '2026-05-01' });

      expect(res.status).toBe(200);
      expect(res.body.data.rateHistory[0].effectiveDate).toBe('2026-05-01');
    });

    it('should return 404 for unknown employee', async () => {
      const res = await request(app)
        .post('/api/v1/employees/nonexistent/update-rate')
        .send({ hourlyRate: 20 });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/employees/:id/rate-history', () => {
    it('should return rate history ordered by effectiveDate DESC', async () => {
      const created = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });

      await request(app)
        .post(`/api/v1/employees/${created.body.data.id}/update-rate`)
        .send({ hourlyRate: 18, effectiveDate: '2026-06-01' });

      const res = await request(app)
        .get(`/api/v1/employees/${created.body.data.id}/rate-history`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].hourlyRate).toBe(18);
      expect(res.body.data[1].hourlyRate).toBe(15);
    });
  });

  describe('DELETE /api/v1/employees/:id', () => {
    it('should soft delete employee', async () => {
      const created = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });

      const res = await request(app).delete(`/api/v1/employees/${created.body.data.id}`);
      expect(res.status).toBe(204);

      // Should no longer appear in list
      const list = await request(app).get('/api/v1/employees');
      expect(list.body.data).toHaveLength(0);
    });
  });

  describe('Audit logging', () => {
    it('should create audit entries for employee lifecycle', async () => {
      // Create
      const created = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });
      const id = created.body.data.id;

      // Update rate
      await request(app)
        .post(`/api/v1/employees/${id}/update-rate`)
        .send({ hourlyRate: 18 });

      // Update name
      await request(app)
        .patch(`/api/v1/employees/${id}`)
        .send({ name: 'Alice Updated' });

      // Delete
      await request(app).delete(`/api/v1/employees/${id}`);

      // Check audit logs
      const res = await request(app).get(`/api/v1/audit/EMPLOYEE/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(4);

      const actions = res.body.data.map((l: any) => l.action);
      expect(actions).toContain('CREATE');
      expect(actions).toContain('UPDATE_RATE');
      expect(actions).toContain('UPDATE');
      expect(actions).toContain('DELETE');
    });
  });
});
