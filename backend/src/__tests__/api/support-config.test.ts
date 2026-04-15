import '../setup';
import request from 'supertest';
import { createApp } from '../../app';

const app = createApp();

describe('Support Staff Config API', () => {
  describe('POST /api/v1/config/support-staff', () => {
    it('should create config entries', async () => {
      const res = await request(app)
        .post('/api/v1/config/support-staff')
        .send({ configs: [{ role: 'BUSSER', percentage: 5 }, { role: 'EXPEDITOR', percentage: 3 }] });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveLength(2);
    });

    it('should accept effectiveDate', async () => {
      const res = await request(app)
        .post('/api/v1/config/support-staff')
        .send({
          configs: [{ role: 'BUSSER', percentage: 7 }],
          effectiveDate: '2026-05-01',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/v1/config/support-staff', () => {
    it('should return current (latest) config per role', async () => {
      await request(app)
        .post('/api/v1/config/support-staff')
        .send({ configs: [{ role: 'BUSSER', percentage: 5 }] });

      await request(app)
        .post('/api/v1/config/support-staff')
        .send({ configs: [{ role: 'BUSSER', percentage: 8 }] });

      const res = await request(app).get('/api/v1/config/support-staff');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].percentage).toBe(8);
    });
  });

  describe('GET /api/v1/config/support-staff/history', () => {
    it('should return all config entries ordered by effectiveDate DESC', async () => {
      await request(app)
        .post('/api/v1/config/support-staff')
        .send({ configs: [{ role: 'BUSSER', percentage: 5 }] });

      await request(app)
        .post('/api/v1/config/support-staff')
        .send({ configs: [{ role: 'BUSSER', percentage: 8 }] });

      const res = await request(app).get('/api/v1/config/support-staff/history');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      // Most recent first
      expect(res.body.data[0].percentage).toBe(8);
      expect(res.body.data[1].percentage).toBe(5);
    });
  });
});
