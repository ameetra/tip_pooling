# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a cloud-native, multi-tenant tip pooling management system for restaurants and coffee shops. The system automates tip calculation and distribution, provides transparency to employees, and maintains complete audit trails for compliance.

**Status:** Pre-development phase. Only PRD and TDD exist currently.

**Key Documentation:**
- `tip-pooling-system-prd.md` - Complete product requirements and feature specifications
- `tip-pooling-system-tdd.md` - Technical architecture, database schema, and implementation plan

## Technology Stack (Planned)

### Frontend
- **Framework:** React 18.x with TypeScript 5.x
- **UI Library:** Material-UI (MUI) v5
- **State Management:** React Context API + React Query
- **Form Handling:** React Hook Form + Zod validation
- **Charts:** Recharts

### Backend
- **Runtime:** Node.js 20.x LTS with TypeScript 5.x
- **Framework:** Express.js 4.x
- **Database:** PostgreSQL 15 (Amazon RDS)
- **ORM:** Prisma 5.x
- **Authentication:** AWS Cognito
- **Testing:** Jest + Supertest

### Infrastructure (AWS)
- **Compute:** AWS Lambda + API Gateway (serverless)
- **Database:** Amazon RDS PostgreSQL (Multi-AZ)
- **Storage:** Amazon S3
- **Email:** Amazon SES
- **CDN:** Amazon CloudFront
- **Monitoring:** Amazon CloudWatch + X-Ray

## Coding Principles

### Minimize Lines of Code
**The primary goal when writing code is to minimize the number of lines.** Write concise, direct code that solves the problem with minimal complexity.

**Guidelines:**
- Favor brevity over verbosity - express logic in the fewest lines possible
- Avoid unnecessary abstractions, helper functions, or wrapper utilities
- Use language features and built-in methods instead of custom implementations
- Eliminate redundant code, intermediate variables, and excessive comments
- Choose simple, direct solutions over complex, "clever" ones
- If you can accomplish something in one line instead of five, do it

**Example - Prefer this:**
```typescript
const activeTips = tips.filter(t => !t.isDeleted && t.amount > 0);
```

**Over this:**
```typescript
// Filter tips to only include active ones with amounts
const activeTips = [];
for (let i = 0; i < tips.length; i++) {
  const tip = tips[i];
  if (tip.isDeleted === false) {
    if (tip.amount > 0) {
      activeTips.push(tip);
    }
  }
}
```

## Development Workflow

### Plan Before Implementing
**CRITICAL: Before implementing any feature, always enter plan mode first.**

**Required workflow:**
1. **Enter Plan Mode** - Use the EnterPlanMode tool to switch to planning
2. **Create Implementation Plan** - List all steps needed to complete the task in `IMPLEMENTATION_PLAN.md`
3. **Get Approval** - Exit plan mode and present the plan to the user
4. **Implement** - Work through the tasks in the plan
5. **Update Progress** - As you complete each step, update `IMPLEMENTATION_PLAN.md` by marking tasks complete `[x]`

**Tracking progress in IMPLEMENTATION_PLAN.md:**
- `[ ]` - Not started
- `[~]` - In progress
- `[x]` - Completed

**Never skip the planning phase.** Even for small features, create a brief plan that lists the steps. This ensures nothing is forgotten and provides visibility into progress.

### Commit Regularly to Git
**Make frequent, focused commits throughout development.**

**Commit guidelines:**
- Commit after completing each logical unit of work (feature, bug fix, refactor)
- Commit when marking tasks complete in `IMPLEMENTATION_PLAN.md`
- Commit at the end of each work session
- Write clear, descriptive commit messages that explain the "why"

**Commit message format:**
```
<type>: <short summary>

<optional detailed description>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Common commit types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring (no functionality change)
- `test:` - Add or update tests
- `docs:` - Documentation changes
- `chore:` - Build, dependencies, or tooling changes

**Example:**
```bash
git add . && git commit -m "$(cat <<'EOF'
feat: Implement tip calculation algorithm

Add TipCalculationService with server proration and support staff logic.
Includes cap enforcement and comprehensive unit tests.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**When to push:**
- Push to GitHub after completing a feature or meaningful milestone
- Push at the end of each work session
- Push before switching to a different task or taking a break

## Architecture Highlights

### Multi-Tenant Design
The system uses a **shared database with tenant isolation** strategy. Every table has a `tenant_id` column, and middleware enforces tenant-scoped queries on all requests. Row-level security (RLS) prevents cross-tenant data access.

### Core Business Logic
The tip calculation algorithm (defined in TDD section 5.1) is the heart of the system:
1. Pools all tips for the day
2. Prorates tips to servers based on hours worked
3. Calculates support staff (bussers/expeditors) tips from servers they worked with
4. Enforces cap: support staff cannot earn more than highest server on their shift
5. Generates detailed breakdowns with effective hourly rates

### Audit Trail
All data modifications are tracked:
- Edits create new records and soft-delete old ones (never actually delete)
- Complete audit log with who/when/what changed
- 7-year retention for compliance (FLSA requirements)

## Database Schema Key Points

**Critical Tables:**
- `tenants` - Restaurant locations (multi-tenant root)
- `employees` - Staff members with roles (SERVER, BUSSER, EXPEDITOR)
- `tip_entries` - Daily tip pool entries with computed columns for cash/electronic/total
- `tip_calculations` - Per-employee breakdown of tips, pay, effective rate
- `audit_logs` - Immutable change history using JSONB for old/new values

**Important Constraints:**
- Unique constraint on `(tenant_id, entry_date, is_deleted)` prevents duplicate active entries
- All tables reference `tenant_id` for isolation
- Soft deletes use `is_deleted` boolean + `deleted_at` timestamp

## Development Commands (When Implemented)

### Backend
```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev

# Run tests
npm test

# Run integration tests
npm run test:integration

# Lint
npm run lint

# Type check
npm run type-check
```

### Frontend
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Lint
npm run lint
```

### Database
```bash
# Create new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations to production
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (WARNING: destroys all data)
npx prisma migrate reset
```

### Infrastructure (Terraform)
```bash
# Initialize Terraform
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy infrastructure
terraform destroy
```

## Implementation Phases

The TDD outlines a 13-week implementation plan:
1. **Foundation** (Weeks 1-2) - AWS setup, database, CI/CD
2. **Core Backend** (Weeks 3-4) - APIs for tenants, users, employees, config
3. **Tip Calculation** (Week 5) - Core algorithm implementation
4. **Frontend Auth** (Week 6) - Login, navigation, role-based routing
5. **Admin Features** (Week 7) - Employee/shift/config management UI
6. **Tip Entry UI** (Week 8) - Daily tip entry form with preview
7. **Data Management** (Week 9) - Edit, audit trail, history views
8. **Employee Portal** (Week 10) - Magic link login, 30-day tip history
9. **Reporting** (Week 11) - CSV export, charts, daily/weekly/monthly reports
10. **Testing & Polish** (Week 12) - E2E tests, load testing, security audit
11. **UAT & Production** (Week 13) - Staging deploy, user testing, go-live

## Critical Implementation Notes

### Tip Calculation Algorithm
- **Location:** Backend service at `tip_calculations/tip-calculation-service.ts` (to be created)
- **Must handle:** Multiple shifts per employee, shared shift logic, support staff caps
- **Testing:** Requires comprehensive unit tests with edge cases (see TDD section 5.1)

### Authentication Flows
- **Admin/Manager:** Standard username/password via AWS Cognito
- **Employee:** Passwordless magic link (15-minute expiry, single-use tokens)

### Security Requirements
- All tenant queries MUST be scoped by `tenant_id` in middleware
- Never trust client-provided `tenant_id` - always derive from JWT token
- Input validation using Zod schemas (shared between frontend/backend)
- All soft deletes must set `is_deleted=true` AND `deleted_at=NOW()`

### Data Integrity Rules
- When editing tip entries: create new record + soft delete old + link via `replaced_by_id`
- Employee rate changes: insert into `employee_rate_history` with `effective_date`
- Support staff config changes: insert new row with `effective_date`, use correct config for calculation date

## API Conventions

**Endpoint Structure:** `/api/v1/<resource>`

**Authentication:** JWT Bearer token in `Authorization` header

**Response Format:**
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
    "details": [/* validation errors if applicable */]
  }
}
```

## Testing Strategy

### Unit Tests
- **Backend:** All services, especially tip calculation algorithm (target 80% coverage)
- **Frontend:** Form validation, calculation display, routing (target 70% coverage)

### Integration Tests
- API endpoints with real database (use test database)
- Multi-tenant isolation verification
- Authentication/authorization flows

### E2E Tests
- Manager: Login → Create tip entry → View results
- Employee: Magic link login → View 30-day history
- Admin: Configure shifts → Manager uses new shift

### Load Testing
- Simulate 100 concurrent users
- Test with 50 employees per tip entry
- Verify < 5 second calculation time

## Cost Monitoring

AWS resources should stay within these monthly targets:
- **Single tenant:** $35-55/month
- **10 tenants:** $130-170/month (~$13-17/tenant at scale)

Set up AWS Budgets with alerts at $50, $100, $150.

## Compliance Notes

**FLSA (Fair Labor Standards Act):**
- Only customer-facing employees in tip pool (servers, bussers, expeditors)
- Management cannot participate in tip pool
- Transparent calculations required
- 7-year audit trail retention

**Data Privacy:**
- Minimal PII collection (name, email only)
- No SSN or payment info stored
- 7-year retention, then archival/deletion

## Future Enhancements (Out of Scope for v1.0)

- Email notifications to employees
- POS system integration
- Payroll system integration
- Mobile apps (iOS/Android)
- Real-time tip tracking
- Multi-currency support
- Scheduling integration
