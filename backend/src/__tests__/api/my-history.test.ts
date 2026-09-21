import '../setup';
import request from 'supertest';
import { createApp } from '../../app';
import { testPrisma } from '../setup';

const app = createApp();

// In test mode the stand-in user's id is 'test-user', so the employee whose history we read must have that id.
const EMPLOYEE_ID = 'test-user';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

describe('GET /api/v1/tips/my-history', () => {
  beforeEach(async () => {
    await testPrisma.employee.create({
      data: { id: EMPLOYEE_ID, tenantId: 'test-tenant', name: 'Test Server', email: 'server@test.com', role: 'SERVER', hourlyRate: 15 },
    });
  });

  const createEntry = async (entryDate: string) => {
    const res = await request(app).post('/api/v1/tips/entries').send({
      entryDate, cashInRegister: 0, cashSales: 0, cashTips: 0, posTips: 200,
      employees: [{ employeeId: EMPLOYEE_ID, role: 'SERVER', hoursWorked: 8 }],
    });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };

  it('shows only published entries, not drafts', async () => {
    const published = daysAgo(1);
    const draft = daysAgo(2);
    const publishedId = await createEntry(published);
    await createEntry(draft);
    await testPrisma.tipEntry.update({ where: { id: publishedId }, data: { publishedAt: new Date() } });

    const res = await request(app).get('/api/v1/tips/my-history');

    expect(res.status).toBe(200);
    expect(res.body.data.records.map((r: any) => r.date)).toEqual([published]);
    expect(res.body.data.records[0].tips).toBe(200);
  });

  it('shows nothing while every entry is still a draft', async () => {
    await createEntry(daysAgo(1));

    const res = await request(app).get('/api/v1/tips/my-history');

    expect(res.body.data.records).toEqual([]);
  });
});
