# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tip Pooling Management System** - A cloud-native, multi-tenant SaaS application for restaurants to automate tip calculation and distribution.

**Current Status:** Pre-development (documentation phase complete)

**Key Documentation:**
- `tip-pooling-system-prd.md` - Product Requirements Document (complete feature specifications)
- `tip-pooling-system-tdd.md` - Technical Design Document (architecture, database schema, API design)
- `tip-pooling-system-test-plan.md` - Comprehensive test plan with 140+ test scenarios
- `IMPLEMENTATION_PLAN.md` - 20-week phased implementation plan (500+ tasks)

## Architecture Overview

### Technology Stack
- **Backend:** Node.js 20 + TypeScript 5.x, Express.js, Prisma ORM
- **Database:** PostgreSQL 15 (Amazon RDS)
- **Frontend:** React 18 + TypeScript 5.x, Material-UI v5, React Query
- **Infrastructure:** AWS Serverless (Lambda, API Gateway, RDS, S3, CloudFront, Cognito, SES)
- **IaC:** Terraform for all infrastructure
- **Testing:** Jest (backend), Vitest (frontend), Playwright (E2E)

### Multi-Tenant Architecture
**Critical:** This is a multi-tenant system with shared database architecture.

**Tenant Isolation Strategy:**
- Every table has a `tenant_id` column (foreign key to tenants table)
- Middleware automatically scopes ALL queries by `tenant_id` from JWT token
- NEVER trust client-provided `tenant_id` - always derive from authenticated JWT
- Use partial unique indexes where needed: `WHERE is_deleted = FALSE`

**Security Requirements:**
- All API endpoints require JWT authentication (except magic link endpoints)
- Role-based authorization: ADMIN, MANAGER, EMPLOYEE (enum in database)
- Tenant isolation enforced at middleware level (before any database query)
- Magic link rate limiting: 3 per email/hour, 10 per IP/hour

### Database Schema Key Points

**Soft Deletes Everywhere:**
- Use `is_deleted` boolean + `deleted_at` timestamp
- NEVER hard delete records (7-year retention for FLSA compliance)
- Create new records instead of updating (for audit trail)

**Critical Tables:**
- `tip_entries` - Has `cash_sales` field (NOT just closing - starting drawer)
- Formula: `cash_tips = closing_drawer - starting_drawer - cash_sales`
- Total tips: `cash_tips + electronic_tips`
- Partial unique index: Only ONE active entry per tenant per date

**Audit Trail:**
- `audit_logs` table tracks ALL modifications
- Stores old/new values in JSONB columns
- Immutable (never update or delete audit logs)

**Magic Link Authentication:**
- `magic_link_tokens` table with 15-minute expiry
- Single-use tokens (`is_used` flag)
- Indexes on email and IP address for rate limiting queries

### Tip Calculation Algorithm

**Location:** `src/services/tip-calculation.service.ts` (to be created)

**Core Logic:**
1. Pool all tips for the day (single pool across all shifts)
2. Prorate to servers based on total hours worked (NOT per shift)
3. Support staff receives percentage from servers they worked same shifts with
4. Cap: Support staff cannot earn more than highest earning server on their shift
5. Rounding: Remainder goes to highest earner (ensure total distributed = tip pool ±$0.01)

**Critical Validations:**
- At least one SERVER must exist (throw error if only support staff)
- Total server hours > 0 (throw error if all servers have 0 hours)
- Tip pool >= 0 (no negative tips)
- Hours worked: 0.5 <= hours <= 16 per employee

**Test Coverage Required:**
- 90%+ code coverage for calculation service
- All 20 test scenarios in test plan (TC-CALC-001 through TC-CALC-020)
- Manual verification with PRD examples

### API Design Patterns

**Standard Response Format:**
```json
{
  "success": true,
  "data": { /* response payload */ }
}
```

**Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [/* validation errors */]
  }
}
```

**Pagination:**
- Query params: `?page=1&limit=50`
- Default limit: 50, max limit: 100

**API Versioning:**
- All endpoints: `/api/v1/*`

### Frontend Architecture

**State Management:**
- React Context for auth state
- React Query for server state (caching, optimistic updates)
- No Redux (keep it simple)

**Form Handling:**
- React Hook Form + Zod validation
- Share Zod schemas between frontend and backend (create shared types package)

**Key Features:**
- Live calculation preview (debounced 500ms, calls `/api/v1/tips/preview`)
- Timezone-aware date display (all dates shown in tenant's timezone)
- Duplicate entry prevention with override option
- Cash sales field (defaults to 0 for credit-card-only restaurants)

## Development Workflow

### Planning Phase (Required for Non-Trivial Features)
**CRITICAL:** Always enter plan mode before implementing features.

**When to use plan mode:**
- New feature implementation (multi-file changes)
- Database schema changes
- API endpoint additions
- Algorithm modifications

**Workflow:**
1. Use EnterPlanMode tool
2. Explore codebase and design approach
3. Create implementation plan in `IMPLEMENTATION_PLAN.md`
4. Update task status: `[ ]` → `[~]` (in progress) → `[x]` (complete)
5. Exit plan mode and implement

### Git Commit Guidelines

**Required format:**
```
<type>: <short summary>

<optional detailed description>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Commit types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `test:` - Add or update tests
- `docs:` - Documentation changes
- `chore:` - Build, dependencies, tooling

**When to commit:**
- After completing each logical unit of work
- When marking tasks complete in `IMPLEMENTATION_PLAN.md`
- Before switching to a different task

## Critical Implementation Notes

### 1. Cash Tips Calculation (PRD Section 3.4.1, TDD Section 3.2.7)

The formula accounts for cash sales revenue:
```
cash_tips = closing_drawer - starting_drawer - cash_sales
```

**Why?** The drawer contains: starting float + cash sales + cash tips

**Example:**
- Starting: $500, Closing: $1,800, Cash Sales: $1,000
- Cash tips = $1,800 - $500 - $1,000 = **$300** ✓

**Special cases:**
- Credit-card-only restaurant: `cash_sales = 0` (defaults to 0)
- Separate tip jar: `starting = 0, closing = total tips, cash_sales = 0`

### 2. Partial Unique Index for Tip Entries (TDD Section 3.2.7)

**DO NOT use regular UNIQUE constraint:**
```sql
-- ❌ WRONG - prevents edit workflow
UNIQUE(tenant_id, entry_date, is_deleted)

-- ✅ CORRECT - only enforces uniqueness on active entries
CREATE UNIQUE INDEX idx_tip_entries_unique_active
ON tip_entries(tenant_id, entry_date)
WHERE is_deleted = FALSE;
```

**Why?** Edit workflow creates new record before soft-deleting old one. Both temporarily exist during transaction.

### 3. Timezone Handling (PRD Section 3.4.1)

**Storage:**
- Dates: Store as DATE type (timezone-agnostic)
- Timestamps: Store in UTC (created_at, updated_at)

**Display:**
- All dates/times converted to tenant's timezone (from tenants.timezone column)
- Use IANA timezone identifiers (e.g., "America/Los_Angeles")

**Date Selection:**
- Allow past entries: Up to 30 days back
- Allow future entries: Up to 2 days ahead

### 4. Magic Link Security (PRD Section 3.1.3, TDD Section 3.2.11)

**Rate Limiting (CRITICAL):**
```typescript
// Check email rate limit
const emailCount = await prisma.magic_link_tokens.count({
  where: {
    email,
    created_at: { gte: new Date(Date.now() - 3600000) } // 1 hour ago
  }
});
if (emailCount >= 3) throw new RateLimitError();

// Check IP rate limit
const ipCount = await prisma.magic_link_tokens.count({
  where: {
    ip_address,
    created_at: { gte: new Date(Date.now() - 3600000) }
  }
});
if (ipCount >= 10) throw new RateLimitError();
```

**Token Validation:**
- Expires after 15 minutes
- Single-use only (check `is_used` flag)
- Mark as used BEFORE generating JWT (prevent race conditions)

### 5. Database Connection Pooling (TDD Section 6.3.3)

**Start WITHOUT RDS Proxy** (saves $15/month):
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 5  // Low limit per Lambda instance
}
```

**Add RDS Proxy ONLY when:**
- Lambda concurrent executions > 50
- Database connection count > 80% of max_connections
- Seeing "too many connections" errors

### 6. Tip Calculation Rounding (PRD Section 3.4.5, TDD Section 5.1)

**Rounding Rules:**
1. Round all intermediate calculations to 2 decimals
2. Sum all distributed tips
3. If `totalDistributed !== totalTipPool` (within $0.01):
   - Add difference to highest earner
   - Ensures total distributed = exact tip pool amount

**Example:**
```typescript
const roundingDiff = Number((totalTipPool - totalDistributed).toFixed(2));
if (Math.abs(roundingDiff) > 0.01) {
  const highestEarner = allCalcs.reduce((max, calc) =>
    calc.finalTips > max.finalTips ? calc : max
  );
  highestEarner.finalTips += roundingDiff;
}
```

## Testing Requirements

### Test Coverage Targets
- Backend: 80%+ overall, 90%+ for tip calculation service
- Frontend: 70%+ overall
- E2E: All critical workflows (5 scenarios minimum)

### Test Pyramid
```
           /\
          /E2E\         10% - End-to-End Tests
         /------\
        /  API   \      30% - Integration/API Tests
       /----------\
      /    UNIT    \    60% - Unit Tests
     /--------------\
```

### Critical Test Scenarios
- See `tip-pooling-system-test-plan.md` for all 140+ test cases
- TC-CALC-001 through TC-CALC-020: Tip calculation algorithm
- TC-E2E-001 through TC-E2E-005: End-to-end workflows
- TC-SEC-001 through TC-SEC-028: Security tests (OWASP Top 10)

## Common Pitfalls to Avoid

1. **Multi-tenant data leakage** - Always scope by tenant_id in middleware
2. **Hard deletes** - Use soft deletes (is_deleted flag) for everything
3. **Forgotten cash_sales** - Don't calculate cash tips as just closing - starting
4. **Regular UNIQUE constraints** - Use partial indexes for soft-deleted data
5. **Client-provided tenant_id** - Never trust, always derive from JWT
6. **Missing validation** - Validate: at least 1 server, hours > 0, tip pool >= 0
7. **Incorrect rounding** - Ensure total distributed = tip pool exactly

## Security Checklist

Before any deployment:
- [ ] All endpoints require authentication (except public endpoints)
- [ ] Tenant isolation tested (cannot access other tenant's data)
- [ ] Input validation on all endpoints (Zod schemas)
- [ ] SQL injection tests passed (parameterized queries only)
- [ ] XSS tests passed (all user input escaped)
- [ ] Rate limiting on magic link endpoints
- [ ] Secrets in AWS Secrets Manager (not in code)
- [ ] TLS 1.3 enforced for all connections
- [ ] Database encryption at rest (AES-256)

## Cost Optimization

**Target Costs:**
- Single tenant: $35-55/month
- 10 tenants: $130-170/month (~$13-17 per tenant at scale)

**Optimization Strategy:**
- Start with RDS db.t3.micro (not Aurora Serverless)
- Add RDS Proxy only when needed (metrics-driven)
- Use AWS Free Tier for first 12 months
- Monitor costs weekly with AWS Budgets

**Consider Aurora Serverless v2 if:**
- Workload is sporadic (< 8 hours active per day)
- Fewer than 5 tenants
- Database connection limits become an issue

## Phase Status Tracking

Track progress in `IMPLEMENTATION_PLAN.md`:
- `[ ]` - Not started
- `[~]` - In progress
- `[x]` - Completed

Update "Current Progress" section weekly.

## References

When implementing features, refer to:
- **PRD** - What to build (features, user stories, requirements)
- **TDD** - How to build (architecture, database, APIs, algorithms)
- **Test Plan** - How to test (test scenarios, coverage targets)
- **Implementation Plan** - When to build (phased schedule, dependencies)

All 4 documents are authoritative and must be followed exactly.
