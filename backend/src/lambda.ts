import serverlessHttp from 'serverless-http';
import { createApp } from './app';
import prisma from './database/client';

const app = createApp();
const httpHandler = serverlessHttp(app);

const ADMIN_SECRET = process.env.LAMBDA_ADMIN_SECRET;

export const handler = async (event: any, context: any) => {
  // Handle admin actions invoked directly (not via API Gateway)
  // Require a secret to prevent unauthorized invocations
  if (event.action) {
    if (!ADMIN_SECRET || event.secret !== ADMIN_SECRET) {
      return { success: false, error: 'Unauthorized' };
    }
    if (event.action === 'migrate') return runMigrations();
    if (event.action === 'seed') return runSeed();
    if (event.action === 'updatePasswordHash' && event.email && event.hash) {
      return updatePasswordHash(event.email, event.hash);
    }
  }
  return httpHandler(event, context);
};

async function updatePasswordHash(email: string, hash: string) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const result = await pool.query(
      `UPDATE "users" SET "passwordHash" = $1 WHERE email = $2 AND "tenantId" = 'default-tenant'`,
      [hash, email]
    );
    return { success: true, updated: result.rowCount };
  } finally {
    await pool.end();
  }
}

async function runMigrations() {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "role" "UserRole" NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("id"),
        CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "users_tenantId_email_key" ON "users"("tenantId", "email");
    `);
    return { success: true, message: 'Migrations applied' };
  } finally {
    await pool.end();
  }
}

async function runSeed() {
  const bcrypt = require('bcrypt');

  try {
    const tenant = await prisma.tenant.upsert({
      where: { id: 'default-tenant' },
      update: {},
      create: { id: 'default-tenant', name: 'Demo Restaurant', address: '123 Main St', timezone: 'America/Los_Angeles' },
    });

    const [alice, bob, charlie] = await Promise.all([
      prisma.employee.upsert({ where: { tenantId_email: { tenantId: tenant.id, email: 'alice@demo.com' } }, update: {}, create: { tenantId: tenant.id, name: 'Alice', email: 'alice@demo.com', role: 'SERVER', hourlyRate: 15.0 } }),
      prisma.employee.upsert({ where: { tenantId_email: { tenantId: tenant.id, email: 'bob@demo.com' } }, update: {}, create: { tenantId: tenant.id, name: 'Bob', email: 'bob@demo.com', role: 'SERVER', hourlyRate: 15.0 } }),
      prisma.employee.upsert({ where: { tenantId_email: { tenantId: tenant.id, email: 'charlie@demo.com' } }, update: {}, create: { tenantId: tenant.id, name: 'Charlie', email: 'charlie@demo.com', role: 'BUSSER', hourlyRate: 12.0 } }),
    ]);

    const existingHistory = await prisma.employeeRateHistory.count({ where: { employeeId: { in: [alice.id, bob.id, charlie.id] } } });
    if (existingHistory === 0) {
      await prisma.employeeRateHistory.createMany({ data: [
        { employeeId: alice.id, hourlyRate: 15.0, effectiveDate: '2026-01-01' },
        { employeeId: bob.id, hourlyRate: 15.0, effectiveDate: '2026-01-01' },
        { employeeId: charlie.id, hourlyRate: 12.0, effectiveDate: '2026-01-01' },
      ]});
    }

    await Promise.all([
      prisma.shift.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'Morning' } }, update: {}, create: { tenantId: tenant.id, name: 'Morning' } }),
      prisma.shift.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'Evening' } }, update: {}, create: { tenantId: tenant.id, name: 'Evening' } }),
    ]);

    const [adminHash, managerHash] = await Promise.all([bcrypt.hash('admin123', 10), bcrypt.hash('manager123', 10)]);
    await Promise.all([
      prisma.user.upsert({ where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } }, update: {}, create: { tenantId: tenant.id, email: 'admin@demo.com', passwordHash: adminHash, role: 'ADMIN' } }),
      prisma.user.upsert({ where: { tenantId_email: { tenantId: tenant.id, email: 'manager@demo.com' } }, update: {}, create: { tenantId: tenant.id, email: 'manager@demo.com', passwordHash: managerHash, role: 'MANAGER' } }),
    ]);

    return { success: true, message: 'Seed complete', tenant: tenant.name };
  } finally {
    await prisma.$disconnect();
  }
}
