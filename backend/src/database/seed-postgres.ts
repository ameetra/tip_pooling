import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma-pg/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set. Run: source .env.production');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding PostgreSQL database...');

  const tenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id: 'default-tenant',
      name: 'Demo Restaurant',
      address: '123 Main St, San Francisco, CA 94102',
      timezone: 'America/Los_Angeles',
    },
  });
  console.log('Tenant:', tenant.name);

  await prisma.shift.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Lunch' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Lunch' },
  });
  await prisma.shift.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Dinner' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Dinner' },
  });
  console.log('Shifts: Lunch, Dinner');

  console.log('Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
