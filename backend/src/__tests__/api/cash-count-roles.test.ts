import '../setup';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Run real JWT auth + RBAC (the test bypass is disabled whenever a Lambda function name is set).
process.env.AWS_LAMBDA_FUNCTION_NAME = 'cash-count-roles-test';
const { createApp } = require('../../app');
const app = createApp();

const tokenAs = (role: string) =>
  jwt.sign({ sub: 'u1', tenantId: 'test-tenant', role, email: 'u@test.com' }, process.env.JWT_SECRET!, { algorithm: 'HS256' });

const listAs = (role: string) =>
  request(app).get('/api/v1/cash-counts').set('Authorization', `Bearer ${tokenAs(role)}`).set('X-Venue', 'test');

describe('cash counts are Admin/Manager only', () => {
  it.each(['ADMIN', 'MANAGER'])('allows %s', async (role) => {
    expect((await listAs(role)).status).toBe(200);
  });

  it.each(['SHIFT_LEAD', 'EMPLOYEE'])('forbids %s', async (role) => {
    expect((await listAs(role)).status).toBe(403);
  });
});
