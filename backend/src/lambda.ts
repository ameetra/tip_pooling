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
    if (event.action === 'getEmployees' && event.tenantSlug) return runGetEmployees(event.tenantSlug, event.email);
    if (event.action === 'setSupportSplitMode' && event.tenantSlug && ['POOLED', 'PER_PERSON'].includes(event.mode)) {
      return runSetSupportSplitMode(event.tenantSlug, event.mode);
    }
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

      -- Per-tenant support-split behavior: POOLED (default, shared role %) or PER_PERSON (each
      -- support worker gets the full role %, e.g. Pieces' "10% to each busser" rule)
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "supportSplitMode" TEXT NOT NULL DEFAULT 'POOLED';

      -- PER_PERSON support split needs a "Total Shift Hours" denominator (how long the shift was
      -- open), not the sum of server hours. Day-of-week defaults per tenant, auto-fill the entry
      -- form; the actual value used per day is stored on the tip entry itself.
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "shiftHoursSun" DOUBLE PRECISION;
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "shiftHoursMon" DOUBLE PRECISION;
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "shiftHoursTue" DOUBLE PRECISION;
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "shiftHoursWed" DOUBLE PRECISION;
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "shiftHoursThu" DOUBLE PRECISION;
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "shiftHoursFri" DOUBLE PRECISION;
      ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "shiftHoursSat" DOUBLE PRECISION;
      ALTER TABLE "tip_entries" ADD COLUMN IF NOT EXISTS "shiftHours" DOUBLE PRECISION;
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

  const validRoles = ['SERVER', 'SHIFT_LEAD', 'BUSSER', 'EXPEDITOR'];
  const primaryRolePriority = ['SERVER', 'SHIFT_LEAD', 'EXPEDITOR', 'BUSSER'];
  const today = new Date().toISOString().slice(0, 10);

  let created = 0, updated = 0;
  const errors: string[] = [];
  for (const e of employees) {
    const name = String(e.name ?? '').trim();
    const email = String(e.email ?? '').trim().toLowerCase();
    const rates = Array.isArray(e.rates)
      ? e.rates.map((r: any) => ({ role: String(r.role ?? '').trim().toUpperCase(), hourlyRate: Number(r.hourlyRate) }))
      : [];
    const ratesValid = rates.length > 0 && rates.every((r: any) => validRoles.includes(r.role) && r.hourlyRate > 0);
    if (!name || !email || !ratesValid) {
      errors.push(`invalid: ${JSON.stringify(e)}`); continue;
    }

    const existing = await prisma.employee.findFirst({ where: { tenantId: tenant.id, email } });
    if (existing) {
      await employeeService.setRoleRates(tenant.id, existing.id, { rates, effectiveDate: today });
      updated++;
    } else {
      const role = primaryRolePriority.find((r) => rates.some((x: any) => x.role === r)) ?? rates[0].role;
      await employeeService.create(tenant.id, { name, email, role, rates });
      created++;
    }
  }
  return { success: true, tenant: tenant.slug, created, updated, errors };
}

// Read-only diagnostic: list employees (optionally filtered by email) with their role rates.
async function runGetEmployees(tenantSlug: string, email?: string) {
  const { getTenantBySlug } = require('./services/tenant.service');
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, error: `Unknown tenant slug: ${tenantSlug}` };

  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id, ...(email ? { email: String(email).trim().toLowerCase() } : {}) },
    include: { roleRates: { orderBy: { role: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  return {
    success: true,
    tenant: tenant.slug,
    employees: employees.map((e) => ({
      name: e.name, email: e.email, role: e.role, isActive: e.isActive,
      rates: e.roleRates.map((r) => ({ role: r.role, hourlyRate: r.hourlyRate })),
    })),
  };
}

// Switch a venue's support-staff split behavior. POOLED (default) shares each role's % among that
// role's workers by hours; PER_PERSON gives each worker the full role % individually.
async function runSetSupportSplitMode(tenantSlug: string, mode: 'POOLED' | 'PER_PERSON') {
  const { getTenantBySlug, setSupportSplitMode } = require('./services/tenant.service');
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, error: `Unknown tenant slug: ${tenantSlug}` };
  await setSupportSplitMode(tenantSlug, mode);
  return { success: true, tenant: tenant.slug, supportSplitMode: mode };
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
