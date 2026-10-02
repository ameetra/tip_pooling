import '../setup';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { testPrisma } from '../setup';

// Run real JWT auth (the test bypass is disabled whenever a Lambda function name is set).
process.env.AWS_LAMBDA_FUNCTION_NAME = 'venue-check-test';
const { createApp } = require('../../app');
const app = createApp();

const tokenFor = (tenantId: string) =>
  jwt.sign({ sub: 'u1', tenantId, role: 'ADMIN', email: 'admin@test.com' }, process.env.JWT_SECRET!, { algorithm: 'HS256' });
const employees = (cookie: string) => request(app).get('/api/v1/employees').set('Cookie', cookie);

describe('venue check (URL venue must match the token venue)', () => {
  beforeEach(async () => {
    await testPrisma.tenant.create({ data: { id: 'pieces-id', name: 'Pieces', slug: 'pieces' } });
    await testPrisma.tenant.create({ data: { id: 'protag-id', name: 'Protagonist Cafe', slug: 'protagonist' } });
  });

  it('allows a request whose venue matches the token', async () => {
    const res = await employees(`gratify_protagonist=${tokenFor('protag-id')}`).set('X-Venue', 'protagonist');
    expect(res.status).toBe(200);
  });

  // Regression: a Protagonist token used on the /pieces site showed Protagonist staff under Pieces branding.
  it('rejects a token from another venue', async () => {
    const res = await employees(`gratify_pieces=${tokenFor('protag-id')}`).set('X-Venue', 'pieces');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('VENUE_MISMATCH');
  });

  it('rejects an unknown venue', async () => {
    const res = await employees(`gratify_nope=${tokenFor('protag-id')}`).set('X-Venue', 'nope');
    expect(res.status).toBe(403);
  });

  it('rejects a request with no venue header', async () => {
    const res = await employees(`gratify_=${tokenFor('protag-id')}`);
    expect(res.status).toBe(403);
  });

  it("ignores another venue's cookie (each venue keeps its own sign-in)", async () => {
    const res = await employees(`gratify_protagonist=${tokenFor('protag-id')}`).set('X-Venue', 'pieces');
    expect(res.status).toBe(401);
  });

  it('rejects a bearer token now that auth is cookie-only', async () => {
    const res = await request(app).get('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenFor('protag-id')}`).set('X-Venue', 'protagonist');
    expect(res.status).toBe(401);
  });
});
