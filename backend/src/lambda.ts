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
    if (event.action === 'provision' && Array.isArray(event.venues)) return runProvision(event.venues);
    if (event.action === 'importEmployees' && event.tenantSlug && Array.isArray(event.employees)) return runImportEmployees(event.tenantSlug, event.employees);
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

      ALTER TABLE "tip_entries" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP;

      ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT;

      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "slug" TEXT;
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key" ON "tenants"("slug");
      ALTER TABLE "magic_link_tokens" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
      -- Keep the legacy single-tenant reachable at /demo after path-based routing ships
      UPDATE "tenants" SET "slug" = 'demo' WHERE "id" = 'default-tenant' AND "slug" IS NULL;
      -- Backfill logo URLs onto the custom domain (one-time; no-op once rewritten)
      UPDATE "tenants" SET "logoUrl" = replace("logoUrl", 'https://d3vrbd8qbym3pv.cloudfront.net', 'https://usegratify.com') WHERE "logoUrl" LIKE 'https://d3vrbd8qbym3pv.cloudfront.net%';

      -- Flexible roles & wages + new cash-tip inputs (additive, non-destructive)
      ALTER TABLE "tip_entries" ADD COLUMN IF NOT EXISTS "cashInRegister" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "tip_entries" ADD COLUMN IF NOT EXISTS "cashTips" DOUBLE PRECISION NOT NULL DEFAULT 0;
      ALTER TABLE "tip_entries" ADD COLUMN IF NOT EXISTS "posTips" DOUBLE PRECISION NOT NULL DEFAULT 0;
      -- Legacy drawer columns no longer written; relax constraints so new inserts can omit them
      ALTER TABLE "tip_entries" ALTER COLUMN "startingDrawer" DROP NOT NULL;
      ALTER TABLE "tip_entries" ALTER COLUMN "closingDrawer" DROP NOT NULL;
      -- One-time backfill: POS tips carried over from the old electronicTips field
      UPDATE "tip_entries" SET "posTips" = "electronicTips" WHERE "posTips" = 0 AND "electronicTips" <> 0;

      ALTER TABLE "employee_rate_history" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'SERVER';
      UPDATE "employee_rate_history" rh SET "role" = e."role"
        FROM "employees" e WHERE rh."employeeId" = e."id" AND rh."role" = 'SERVER' AND e."role" <> 'SERVER';

      CREATE TABLE IF NOT EXISTS "employee_role_rates" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "hourlyRate" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("id"),
        CONSTRAINT "employee_role_rates_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "employee_role_rates_employeeId_role_key" ON "employee_role_rates"("employeeId", "role");
      -- Backfill current per-role rate from each employee's existing single rate + primary role
      INSERT INTO "employee_role_rates" ("id", "employeeId", "role", "hourlyRate")
        SELECT 'err_' || e."id", e."id", e."role", e."hourlyRate" FROM "employees" e
        ON CONFLICT ("employeeId", "role") DO NOTHING;
    `);
    return { success: true, message: 'Migrations applied' };
  } finally {
    await pool.end();
  }
}

async function runProvision(venues: any[]) {
  const { upsertTenant, upsertVenueAdmin } = require('./services/tenant.service');
  const results = [];
  for (const v of venues) {
    const admins = v.admins ?? (v.adminEmail ? [{ email: v.adminEmail, password: v.adminPassword }] : []);
    if (!v.slug || !v.name || admins.length === 0) {
      return { success: false, error: `Each venue needs slug, name, and at least one admin (got ${JSON.stringify(v)})` };
    }
    const tenant = await upsertTenant(v);
    for (const a of admins) {
      if (!a.email || !a.password || a.password.length < 8) {
        return { success: false, error: `Admin needs email + password >=8 chars (venue ${v.slug})` };
      }
      await upsertVenueAdmin(tenant.id, a.email, a.password);
    }
    results.push({ slug: tenant.slug, name: tenant.name, admins: admins.map((a: any) => a.email) });
  }
  return { success: true, provisioned: results };
}

// Bulk-import employees into a tenant (idempotent: skips existing emails). Reusable for any venue.
async function runImportEmployees(tenantSlug: string, employees: any[]) {
  const { getTenantBySlug } = require('./services/tenant.service');
  const { employeeService } = require('./services/employee.service');
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, error: `Unknown tenant slug: ${tenantSlug}` };

  const valid = ['SERVER', 'SHIFT_LEAD', 'BUSSER', 'EXPEDITOR'];
  let created = 0, skipped = 0;
  const errors: string[] = [];
  for (const e of employees) {
    const name = String(e.name ?? '').trim();
    const email = String(e.email ?? '').trim().toLowerCase();
    const role = String(e.role ?? '').trim().toUpperCase();
    const hourlyRate = Number(e.hourlyRate);
    if (!name || !email || !valid.includes(role) || !(hourlyRate > 0)) {
      errors.push(`invalid: ${JSON.stringify(e)}`); continue;
    }
    const existing = await prisma.employee.findFirst({ where: { tenantId: tenant.id, email } });
    if (existing) { skipped++; continue; }
    await employeeService.create(tenant.id, { name, email, role, hourlyRate });
    created++;
  }
  return { success: true, tenant: tenant.slug, created, skipped, errors };
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
        { employeeId: alice.id, role: 'SERVER', hourlyRate: 15.0, effectiveDate: '2026-01-01' },
        { employeeId: bob.id, role: 'SERVER', hourlyRate: 15.0, effectiveDate: '2026-01-01' },
        { employeeId: charlie.id, role: 'BUSSER', hourlyRate: 12.0, effectiveDate: '2026-01-01' },
      ]});
    }

    await Promise.all([
      prisma.employeeRoleRate.upsert({ where: { employeeId_role: { employeeId: alice.id, role: 'SERVER' } }, update: {}, create: { employeeId: alice.id, role: 'SERVER', hourlyRate: 15.0 } }),
      prisma.employeeRoleRate.upsert({ where: { employeeId_role: { employeeId: bob.id, role: 'SERVER' } }, update: {}, create: { employeeId: bob.id, role: 'SERVER', hourlyRate: 15.0 } }),
      prisma.employeeRoleRate.upsert({ where: { employeeId_role: { employeeId: charlie.id, role: 'BUSSER' } }, update: {}, create: { employeeId: charlie.id, role: 'BUSSER', hourlyRate: 12.0 } }),
    ]);

    const supportEmail = process.env.SUPPORT_EMAIL || 'support@tippooling.app';
    const supportPassword = process.env.SUPPORT_PASSWORD;
    if (!supportPassword) return { success: false, error: 'SUPPORT_PASSWORD env var is required' };

    const [adminHash, managerHash, supportHash] = await Promise.all([
      bcrypt.hash('admin123', 10),
      bcrypt.hash('manager123', 10),
      bcrypt.hash(supportPassword, 10),
    ]);
    await Promise.all([
      prisma.user.upsert({ where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } }, update: {}, create: { tenantId: tenant.id, email: 'admin@demo.com', passwordHash: adminHash, role: 'ADMIN' } }),
      prisma.user.upsert({ where: { tenantId_email: { tenantId: tenant.id, email: 'manager@demo.com' } }, update: {}, create: { tenantId: tenant.id, email: 'manager@demo.com', passwordHash: managerHash, role: 'MANAGER' } }),
      // Developer support account — credentials in AWS Secrets Manager (tip-pooling/support-account)
      prisma.user.upsert({ where: { tenantId_email: { tenantId: tenant.id, email: supportEmail } }, update: {}, create: { tenantId: tenant.id, email: supportEmail, passwordHash: supportHash, role: 'ADMIN' } }),
    ]);

    return { success: true, message: 'Seed complete', tenant: tenant.name };
  } finally {
    await prisma.$disconnect();
  }
}
