import '../setup';
import request from 'supertest';
import { createApp } from '../../app';

const app = createApp();

const add = (email: string, password: string, role = 'SHIFT_LEAD') =>
  request(app).post('/api/v1/users').send({ email, password, role });
const listEmails = async () => (await request(app).get('/api/v1/users')).body.data.map((u: any) => u.email);
const login = (email: string, password: string) => request(app).post('/api/v1/auth/login').send({ email, password });

describe('re-adding removed staff', () => {
  it('reactivates a removed shift lead with the new role and password, forcing a change', async () => {
    const first = await add('lead@test.com', 'FirstPassword1');
    await request(app).delete(`/api/v1/users/${first.body.data.id}`).expect(204);
    expect(await listEmails()).not.toContain('lead@test.com');

    const again = await add('lead@test.com', 'SecondPassword2', 'MANAGER');
    expect(again.status).toBe(201);
    expect(again.body.data).toMatchObject({ id: first.body.data.id, role: 'MANAGER' });
    expect(await listEmails()).toContain('lead@test.com');

    expect((await login('lead@test.com', 'FirstPassword1')).status).toBe(401);
    const res = await login('lead@test.com', 'SecondPassword2');
    expect(res.status).toBe(200);
    expect(res.body.data.user.mustChangePassword).toBe(true);
  });

  it('refuses an email that already has an active login, with a clear message', async () => {
    await add('lead@test.com', 'FirstPassword1').expect(201);
    const res = await add('lead@test.com', 'SecondPassword2');
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('This email already has a login at this venue.');
    expect((await login('lead@test.com', 'FirstPassword1')).status).toBe(200);
  });
});
