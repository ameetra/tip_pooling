import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from './client';

async function seed() {
  console.log('Seeding database...');

  const tenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id: 'default-tenant',
      name: 'Demo Restaurant',
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

  const [adminHash, managerHash] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('manager123', 10),
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
  ]);

  console.log('Seed complete:', {
    tenant: tenant.name,
    shifts: [morning.name, evening.name],
    users: ['admin@demo.com (admin123)', 'manager@demo.com (manager123)'],
  });

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
