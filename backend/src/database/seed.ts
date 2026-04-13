import 'dotenv/config';
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

  await Promise.all([
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

  console.log('Seed complete:', {
    tenant: tenant.name,
    shifts: [morning.name, evening.name],
  });

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
