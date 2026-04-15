// Lambda handler for database setup (create tables + seed data)
// Invoke: aws lambda invoke --function-name tip-pooling-dev-api --payload '{"action":"migrate"}' out.json

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './generated/prisma-pg/client';

const DDL = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  "hourlyRate" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS employees_tenantId_email_key ON employees("tenantId", email);
CREATE INDEX IF NOT EXISTS employees_tenantId_isActive_idx ON employees("tenantId", "isActive");

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS shifts_tenantId_name_key ON shifts("tenantId", name);
CREATE INDEX IF NOT EXISTS shifts_tenantId_isActive_idx ON shifts("tenantId", "isActive");

CREATE TABLE IF NOT EXISTS support_staff_config (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES tenants(id),
  role TEXT NOT NULL,
  percentage DOUBLE PRECISION NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS support_staff_config_tenantId_role_idx ON support_staff_config("tenantId", role);

CREATE TABLE IF NOT EXISTS tip_entries (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES tenants(id),
  "entryDate" TEXT NOT NULL,
  "startingDrawer" DOUBLE PRECISION NOT NULL,
  "closingDrawer" DOUBLE PRECISION NOT NULL,
  "cashSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "electronicTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "replacedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS tip_entries_tenantId_entryDate_isDeleted_idx ON tip_entries("tenantId", "entryDate", "isDeleted");

CREATE TABLE IF NOT EXISTS tip_calculations (
  id TEXT PRIMARY KEY,
  "tipEntryId" TEXT NOT NULL REFERENCES tip_entries(id),
  "employeeId" TEXT NOT NULL REFERENCES employees(id),
  "roleOnDay" TEXT NOT NULL,
  "totalHours" DOUBLE PRECISION NOT NULL,
  "hourlyPay" DOUBLE PRECISION NOT NULL,
  "baseTips" DOUBLE PRECISION NOT NULL,
  "supportTipsGiven" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "supportTipsReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "finalTips" DOUBLE PRECISION NOT NULL,
  "totalPay" DOUBLE PRECISION NOT NULL,
  "effectiveHourlyRate" DOUBLE PRECISION NOT NULL,
  "snapshotHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "snapshotSupportPct" DOUBLE PRECISION NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS tip_calculations_tipEntryId_idx ON tip_calculations("tipEntryId");

CREATE TABLE IF NOT EXISTS shift_assignments (
  id TEXT PRIMARY KEY,
  "tipCalculationId" TEXT NOT NULL REFERENCES tip_calculations(id),
  "shiftId" TEXT NOT NULL REFERENCES shifts(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS shift_assignments_tipCalculationId_shiftId_key ON shift_assignments("tipCalculationId", "shiftId");

CREATE TABLE IF NOT EXISTS employee_rate_history (
  id TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL REFERENCES employees(id),
  "hourlyRate" DOUBLE PRECISION NOT NULL,
  "effectiveDate" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS employee_rate_history_employeeId_idx ON employee_rate_history("employeeId");

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  action TEXT NOT NULL,
  "oldValues" TEXT,
  "newValues" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS audit_logs_tenantId_entityType_idx ON audit_logs("tenantId", "entityType");
CREATE INDEX IF NOT EXISTS audit_logs_entityId_idx ON audit_logs("entityId");
`;

export const handler = async (event: any) => {
  const action = event.action || 'test';
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return { statusCode: 500, body: 'DATABASE_URL not set' };
  }

  const pool = new Pool({ connectionString, max: 2, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    if (action === 'migrate') {
      // Create all tables
      const statements = DDL.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt);
      }
      return { statusCode: 200, body: JSON.stringify({ message: 'Migration complete', tables: statements.length }) };
    }

    if (action === 'seed') {
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
      return { statusCode: 200, body: JSON.stringify({ message: 'Seed complete', tenant: tenant.name }) };
    }

    // Default: test connection
    const result = await prisma.$queryRawUnsafe('SELECT current_database() as db, current_timestamp as ts');
    return { statusCode: 200, body: JSON.stringify({ message: 'Connected', result }) };

  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message, stack: error.stack }) };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};
