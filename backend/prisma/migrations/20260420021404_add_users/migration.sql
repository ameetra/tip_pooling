-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hourlyRate" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "employees_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shifts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "support_staff_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "percentage" REAL NOT NULL,
    "effectiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_staff_config_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tip_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "entryDate" TEXT NOT NULL,
    "startingDrawer" REAL NOT NULL,
    "closingDrawer" REAL NOT NULL,
    "cashSales" REAL NOT NULL DEFAULT 0,
    "electronicTips" REAL NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "replacedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tip_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tip_calculations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipEntryId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "roleOnDay" TEXT NOT NULL,
    "totalHours" REAL NOT NULL,
    "hourlyPay" REAL NOT NULL,
    "baseTips" REAL NOT NULL,
    "supportTipsGiven" REAL NOT NULL DEFAULT 0,
    "supportTipsReceived" REAL NOT NULL DEFAULT 0,
    "finalTips" REAL NOT NULL,
    "totalPay" REAL NOT NULL,
    "effectiveHourlyRate" REAL NOT NULL,
    "snapshotHourlyRate" REAL NOT NULL DEFAULT 0,
    "snapshotSupportPct" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "tip_calculations_tipEntryId_fkey" FOREIGN KEY ("tipEntryId") REFERENCES "tip_entries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tip_calculations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipCalculationId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    CONSTRAINT "shift_assignments_tipCalculationId_fkey" FOREIGN KEY ("tipCalculationId") REFERENCES "tip_calculations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "employee_rate_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "hourlyRate" REAL NOT NULL,
    "effectiveDate" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_rate_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "magic_link_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" DATETIME,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "employees_tenantId_isActive_idx" ON "employees"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenantId_email_key" ON "employees"("tenantId", "email");

-- CreateIndex
CREATE INDEX "shifts_tenantId_isActive_idx" ON "shifts"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_tenantId_name_key" ON "shifts"("tenantId", "name");

-- CreateIndex
CREATE INDEX "support_staff_config_tenantId_role_idx" ON "support_staff_config"("tenantId", "role");

-- CreateIndex
CREATE INDEX "tip_entries_tenantId_entryDate_isDeleted_idx" ON "tip_entries"("tenantId", "entryDate", "isDeleted");

-- CreateIndex
CREATE INDEX "tip_calculations_tipEntryId_idx" ON "tip_calculations"("tipEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_tipCalculationId_shiftId_key" ON "shift_assignments"("tipCalculationId", "shiftId");

-- CreateIndex
CREATE INDEX "employee_rate_history_employeeId_idx" ON "employee_rate_history"("employeeId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_entityType_idx" ON "audit_logs"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "magic_link_tokens_token_key" ON "magic_link_tokens"("token");

-- CreateIndex
CREATE INDEX "magic_link_tokens_email_idx" ON "magic_link_tokens"("email");

-- CreateIndex
CREATE INDEX "magic_link_tokens_ipAddress_idx" ON "magic_link_tokens"("ipAddress");
