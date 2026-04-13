// Set test tenant before any imports that read env
process.env.DEFAULT_TENANT_ID = 'test-tenant';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';

// Use in-memory SQLite for tests
const adapter = new PrismaBetterSqlite3({ url: ':memory:' });
const testPrisma = new PrismaClient({ adapter });

// Override the default client module
jest.mock('../database/client', () => ({
  __esModule: true,
  default: testPrisma,
}));

// Push schema to in-memory DB before tests
beforeAll(async () => {
  // We need to create tables in the in-memory DB
  // Read the schema and create tables manually via raw SQL
  const sqlite = (adapter as any);

  // Use prisma db push with a file DB, then copy schema
  // Simpler approach: create tables via raw SQL
  await testPrisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await testPrisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      hourlyRate REAL NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id),
      UNIQUE(tenantId, email)
    )
  `);

  await testPrisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id),
      UNIQUE(tenantId, name)
    )
  `);

  await testPrisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS support_staff_config (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      role TEXT NOT NULL,
      percentage REAL NOT NULL,
      effectiveDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id)
    )
  `);

  await testPrisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tip_entries (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      entryDate TEXT NOT NULL,
      startingDrawer REAL NOT NULL,
      closingDrawer REAL NOT NULL,
      cashSales REAL NOT NULL DEFAULT 0,
      electronicTips REAL NOT NULL DEFAULT 0,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      deletedAt DATETIME,
      replacedById TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id)
    )
  `);

  await testPrisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tip_calculations (
      id TEXT PRIMARY KEY,
      tipEntryId TEXT NOT NULL,
      employeeId TEXT NOT NULL,
      roleOnDay TEXT NOT NULL,
      totalHours REAL NOT NULL,
      hourlyPay REAL NOT NULL,
      baseTips REAL NOT NULL,
      supportTipsGiven REAL NOT NULL DEFAULT 0,
      supportTipsReceived REAL NOT NULL DEFAULT 0,
      finalTips REAL NOT NULL,
      totalPay REAL NOT NULL,
      effectiveHourlyRate REAL NOT NULL,
      FOREIGN KEY (tipEntryId) REFERENCES tip_entries(id),
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    )
  `);

  await testPrisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS shift_assignments (
      id TEXT PRIMARY KEY,
      tipCalculationId TEXT NOT NULL,
      shiftId TEXT NOT NULL,
      FOREIGN KEY (tipCalculationId) REFERENCES tip_calculations(id),
      FOREIGN KEY (shiftId) REFERENCES shifts(id),
      UNIQUE(tipCalculationId, shiftId)
    )
  `);

  // Create indexes
  await testPrisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_employees_tenant_active ON employees(tenantId, isActive)`);
  await testPrisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_shifts_tenant_active ON shifts(tenantId, isActive)`);
  await testPrisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_support_config_tenant_role ON support_staff_config(tenantId, role)`);
  await testPrisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tip_entries_tenant_date ON tip_entries(tenantId, entryDate, isDeleted)`);
  await testPrisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tip_calcs_entry ON tip_calculations(tipEntryId)`);
});

// Seed test tenant before each test file
beforeEach(async () => {
  // Clean all tables in reverse dependency order
  await testPrisma.$executeRawUnsafe('DELETE FROM shift_assignments');
  await testPrisma.$executeRawUnsafe('DELETE FROM tip_calculations');
  await testPrisma.$executeRawUnsafe('DELETE FROM tip_entries');
  await testPrisma.$executeRawUnsafe('DELETE FROM support_staff_config');
  await testPrisma.$executeRawUnsafe('DELETE FROM employees');
  await testPrisma.$executeRawUnsafe('DELETE FROM shifts');
  await testPrisma.$executeRawUnsafe('DELETE FROM tenants');

  // Create test tenant
  await testPrisma.tenant.create({
    data: { id: 'test-tenant', name: 'Test Restaurant', timezone: 'America/Los_Angeles' },
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

export { testPrisma };
