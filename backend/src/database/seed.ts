import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from './client';
import { createTenant } from '../services/tenant.service';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Seed one venue: tenant + admin (via shared service) + shifts, support config, employees.
async function seedVenue(v: { slug: string; name: string; adminEmail: string; adminPassword: string; employees: { name: string; email: string; role: string; rate: number }[] }) {
  const { id } = await createTenant({
    slug: v.slug, name: v.name, adminEmail: v.adminEmail, adminPassword: v.adminPassword,
    logoUrl: `${APP_URL}/logos/${v.slug}.png`,
  });
  for (const name of ['Morning', 'Evening']) {
    await prisma.shift.upsert({ where: { tenantId_name: { tenantId: id, name } }, update: {}, create: { tenantId: id, name } });
  }
  for (const emp of v.employees) {
    await prisma.employee.upsert({
      where: { tenantId_email: { tenantId: id, email: emp.email } }, update: {},
      create: { tenantId: id, name: emp.name, email: emp.email, role: emp.role, hourlyRate: emp.rate },
    });
  }
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

  const [morning, evening] = await Promise.all([
    prisma.shift.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: 'Morning' } },
      update: {},
      create: { tenantId: tenant.id, name: 'Morning' },
    }),
    prisma.shift.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: 'Evening' } },
      update: {},
      create: { tenantId: tenant.id, name: 'Evening' },
    }),
  ]);

  await Promise.all([
    prisma.supportStaffConfig.create({
      data: { tenantId: tenant.id, role: 'BUSSER', percentage: 20 },
    }),
    prisma.supportStaffConfig.create({
      data: { tenantId: tenant.id, role: 'EXPEDITOR', percentage: 15 },
    }),
  ]);

  const [alice, bob, charlie] = await Promise.all([
    prisma.employee.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'alice@demo.com' } },
      update: {},
      create: { tenantId: tenant.id, name: 'Alice', email: 'alice@demo.com', role: 'SERVER', hourlyRate: 15.0 },
    }),
    prisma.employee.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'bob@demo.com' } },
      update: {},
      create: { tenantId: tenant.id, name: 'Bob', email: 'bob@demo.com', role: 'SERVER', hourlyRate: 15.0 },
    }),
    prisma.employee.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'charlie@demo.com' } },
      update: {},
      create: { tenantId: tenant.id, name: 'Charlie', email: 'charlie@demo.com', role: 'BUSSER', hourlyRate: 12.0 },
    }),
  ]);

  const existingHistory = await prisma.employeeRateHistory.count({
    where: { employeeId: { in: [alice.id, bob.id, charlie.id] } },
  });
  if (existingHistory === 0) {
    await prisma.employeeRateHistory.createMany({
      data: [
        { employeeId: alice.id, hourlyRate: 15.0, effectiveDate: '2026-01-01' },
        { employeeId: bob.id, hourlyRate: 15.0, effectiveDate: '2026-01-01' },
        { employeeId: charlie.id, hourlyRate: 12.0, effectiveDate: '2026-01-01' },
      ],
    });
  }

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
      { name: 'Pat', email: 'pat@pieces.com', role: 'SERVER', rate: 16 },
      { name: 'Quinn', email: 'quinn@pieces.com', role: 'SERVER', rate: 16 },
      { name: 'Riley', email: 'riley@pieces.com', role: 'BUSSER', rate: 13 },
    ]}),
    seedVenue({ slug: 'protagonist', name: 'Protagonist Cafe', adminEmail: 'cafe-admin@demo.com', adminPassword: 'cafe1234', employees: [
      { name: 'Sam', email: 'sam@protagonist.com', role: 'SERVER', rate: 15 },
      { name: 'Taylor', email: 'taylor@protagonist.com', role: 'BUSSER', rate: 12 },
    ]}),
    seedVenue({ slug: 'antagonist', name: 'Antagonist Cafe', adminEmail: 'cafe-admin@demo.com', adminPassword: 'cafe1234', employees: [
      { name: 'Uma', email: 'uma@antagonist.com', role: 'SERVER', rate: 15 },
      { name: 'Vic', email: 'vic@antagonist.com', role: 'EXPEDITOR', rate: 14 },
    ]}),
  ]);

  console.log('Seed complete:', {
    tenant: tenant.name,
    shifts: [morning.name, evening.name],
    users: ['admin@demo.com', 'manager@demo.com', supportEmail],
    venues,
  });

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
