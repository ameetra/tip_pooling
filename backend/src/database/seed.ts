import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from './client';
import { createTenant } from '../services/tenant.service';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

interface SeedEmployee { name: string; email: string; role: string; rates: { role: string; rate: number }[] }

// Upsert an employee plus its per-role rates and rate history. hourlyRate (legacy) = primary role's rate.
async function upsertEmployee(tenantId: string, emp: SeedEmployee) {
  const primaryRate = emp.rates.find((r) => r.role === emp.role)?.rate ?? emp.rates[0].rate;
  const e = await prisma.employee.upsert({
    where: { tenantId_email: { tenantId, email: emp.email } }, update: {},
    create: { tenantId, name: emp.name, email: emp.email, role: emp.role, hourlyRate: primaryRate },
  });
  for (const r of emp.rates) {
    await prisma.employeeRoleRate.upsert({
      where: { employeeId_role: { employeeId: e.id, role: r.role } }, update: {},
      create: { employeeId: e.id, role: r.role, hourlyRate: r.rate },
    });
    const has = await prisma.employeeRateHistory.findFirst({ where: { employeeId: e.id, role: r.role } });
    if (!has) await prisma.employeeRateHistory.create({ data: { employeeId: e.id, role: r.role, hourlyRate: r.rate, effectiveDate: '2026-01-01' } });
  }
  return e;
}

// Seed one venue: tenant + admin (via shared service) + support config + employees.
async function seedVenue(v: { slug: string; name: string; adminEmail: string; adminPassword: string; employees: SeedEmployee[] }) {
  const { id } = await createTenant({
    slug: v.slug, name: v.name, adminEmail: v.adminEmail, adminPassword: v.adminPassword,
    logoUrl: `${APP_URL}/logos/${v.slug}.png`,
  });
  for (const emp of v.employees) await upsertEmployee(id, emp);
  const cfg = await prisma.supportStaffConfig.count({ where: { tenantId: id } });
  if (cfg === 0) await prisma.supportStaffConfig.create({ data: { tenantId: id, role: 'BUSSER', percentage: 20 } });
  return v.slug;
}

async function seed() {
  console.log('Seeding database...');

  const tenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: { slug: 'demo' },
    create: {
      id: 'default-tenant',
      name: 'Demo Restaurant',
      slug: 'demo',
      address: '123 Main St, Anytown, USA',
      timezone: 'America/Los_Angeles',
    },
  });

  await Promise.all([
    prisma.supportStaffConfig.create({ data: { tenantId: tenant.id, role: 'BUSSER', percentage: 20 } }),
    prisma.supportStaffConfig.create({ data: { tenantId: tenant.id, role: 'EXPEDITOR', percentage: 15 } }),
  ]);

  // Alice and Charlie are multi-role (different base rate per role) to exercise the new flow.
  await upsertEmployee(tenant.id, { name: 'Alice', email: 'alice@demo.com', role: 'SERVER', rates: [{ role: 'SERVER', rate: 15 }, { role: 'BUSSER', rate: 12 }] });
  await upsertEmployee(tenant.id, { name: 'Bob', email: 'bob@demo.com', role: 'SERVER', rates: [{ role: 'SERVER', rate: 15 }] });
  await upsertEmployee(tenant.id, { name: 'Charlie', email: 'charlie@demo.com', role: 'BUSSER', rates: [{ role: 'BUSSER', rate: 12 }, { role: 'SERVER', rate: 14 }] });

  const supportEmail = process.env.SUPPORT_EMAIL || 'support@tippooling.app';
  const supportPassword = process.env.SUPPORT_PASSWORD;
  if (!supportPassword) throw new Error('SUPPORT_PASSWORD env var is required');

  const [adminHash, managerHash, supportHash] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('manager123', 10),
    bcrypt.hash(supportPassword, 10),
  ]);

  await Promise.all([
    (prisma as any).user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
      update: {},
      create: { tenantId: tenant.id, email: 'admin@demo.com', passwordHash: adminHash, role: 'ADMIN' },
    }),
    (prisma as any).user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'manager@demo.com' } },
      update: {},
      create: { tenantId: tenant.id, email: 'manager@demo.com', passwordHash: managerHash, role: 'MANAGER' },
    }),
    // Developer support account — password stored in AWS Secrets Manager (tip-pooling/support-account)
    (prisma as any).user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: supportEmail } },
      update: {},
      create: { tenantId: tenant.id, email: supportEmail, passwordHash: supportHash, role: 'ADMIN' },
    }),
  ]);

  // Three SaaS venues — path-based (/pieces, /protagonist, /antagonist).
  // The two cafés share one admin login (cafe-admin@demo.com) that exists in both tenants.
  const venues = await Promise.all([
    seedVenue({ slug: 'pieces', name: 'Pieces', adminEmail: 'pieces-admin@demo.com', adminPassword: 'pieces123', employees: [
      { name: 'Pat', email: 'pat@pieces.com', role: 'SERVER', rates: [{ role: 'SERVER', rate: 16 }] },
      { name: 'Quinn', email: 'quinn@pieces.com', role: 'SERVER', rates: [{ role: 'SERVER', rate: 16 }, { role: 'BUSSER', rate: 13 }] },
      { name: 'Riley', email: 'riley@pieces.com', role: 'BUSSER', rates: [{ role: 'BUSSER', rate: 13 }] },
    ]}),
    seedVenue({ slug: 'protagonist', name: 'Protagonist Cafe', adminEmail: 'cafe-admin@demo.com', adminPassword: 'cafe1234', employees: [
      { name: 'Sam', email: 'sam@protagonist.com', role: 'SERVER', rates: [{ role: 'SERVER', rate: 15 }] },
      { name: 'Taylor', email: 'taylor@protagonist.com', role: 'BUSSER', rates: [{ role: 'BUSSER', rate: 12 }] },
    ]}),
    seedVenue({ slug: 'antagonist', name: 'Antagonist Cafe', adminEmail: 'cafe-admin@demo.com', adminPassword: 'cafe1234', employees: [
      { name: 'Uma', email: 'uma@antagonist.com', role: 'SERVER', rates: [{ role: 'SERVER', rate: 15 }] },
      { name: 'Vic', email: 'vic@antagonist.com', role: 'EXPEDITOR', rates: [{ role: 'EXPEDITOR', rate: 14 }] },
    ]}),
  ]);

  console.log('Seed complete:', {
    tenant: tenant.name,
    users: ['admin@demo.com', 'manager@demo.com', supportEmail],
    venues,
  });

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
