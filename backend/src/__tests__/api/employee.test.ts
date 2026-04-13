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
    it('should update employee', async () => {
      const created = await request(app)
        .post('/api/v1/employees')
        .send({ name: 'Alice', email: 'alice@test.com', role: 'SERVER', hourlyRate: 15 });

      const res = await request(app)
        .patch(`/api/v1/employees/${created.body.data.id}`)
        .send({ hourlyRate: 18 });

      expect(res.status).toBe(200);
      expect(res.body.data.hourlyRate).toBe(18);
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
});
