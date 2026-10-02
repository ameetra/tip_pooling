import '../setup';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Run real JWT auth + RBAC (the test bypass is disabled whenever a Lambda function name is set).
process.env.AWS_LAMBDA_FUNCTION_NAME = 'deleted-report-roles-test';
const { createApp } = require('../../app');
const app = createApp();

const tokenAs = (role: string) =>
  jwt.sign({ sub: 'u1', tenantId: 'test-tenant', role, email: 'u@test.com' }, process.env.JWT_SECRET!, { algorithm: 'HS256' });

const reportAs = (role: string) =>
  request(app).get('/api/v1/tips/deleted-report?start_date=2026-04-01&end_date=2026-04-30')
    .set('Authorization', `Bearer ${tokenAs(role)}`).set('X-Venue', 'test');

describe('deleted entries report is Admin only', () => {
  it('allows ADMIN', async () => {
    expect((await reportAs('ADMIN')).status).toBe(200);
  });

  it.each(['MANAGER', 'SHIFT_LEAD', 'EMPLOYEE'])('forbids %s', async (role) => {
    expect((await reportAs(role)).status).toBe(403);
  });
});
