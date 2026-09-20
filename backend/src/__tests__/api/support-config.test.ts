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

  describe('effective dates', () => {
    const post = (configs: object[]) => request(app).post('/api/v1/config/support-staff').send({ configs });

    it('applies a separate effective date to each role', async () => {
      await post([
        { role: 'BUSSER', percentage: 8, effectiveDate: '2026-01-01' },
        { role: 'EXPEDITOR', percentage: 4, effectiveDate: '2026-02-01' },
      ]);
      const history = await request(app).get('/api/v1/config/support-staff/history');
      const byRole = Object.fromEntries(history.body.data.map((c: any) => [c.role, c.effectiveDate.slice(0, 10)]));
      expect(byRole).toEqual({ BUSSER: '2026-01-01', EXPEDITOR: '2026-02-01' });
    });

    it('does not treat a future-dated change as current', async () => {
      await post([{ role: 'BUSSER', percentage: 8, effectiveDate: '2026-01-01' }]);
      await post([{ role: 'BUSSER', percentage: 12, effectiveDate: '2099-01-01' }]);

      const res = await request(app).get('/api/v1/config/support-staff');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].percentage).toBe(8);
    });

    it('rejects an invalid effective date', async () => {
      const res = await post([{ role: 'BUSSER', percentage: 8, effectiveDate: '2026-13-45' }]);
      expect(res.status).toBe(400);
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
