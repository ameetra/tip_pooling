# Tip Pooling System - Implementation Plan

**Created:** December 29, 2025
**Last Updated:** April 26, 2026
**Status:** In Progress

## Current Progress

### Milestone 1: Tip Calculation Service (Local Development) - COMPLETE
- [x] Initialize backend project (Node.js + TypeScript + Jest)
- [x] Define types/interfaces (`backend/src/types/tip-calculation.types.ts`)
- [x] Implement tip calculation service (`backend/src/services/tip-calculation.service.ts`)
- [x] Write all 20 test cases (TC-CALC-001 through TC-CALC-020) + 3 cash tips tests
- [x] All 23 tests passing, 100% statement/line/function coverage, 94.44% branch coverage

### Milestone 2: Prisma + Express REST API - COMPLETE
- [x] Prisma schema with SQLite + better-sqlite3 adapter
- [x] Express v5 REST API with CRUD for employees, shifts, support config, tip entries
- [x] Tip preview and creation endpoints with full calculation pipeline
- [x] 20 integration tests (43 total with unit tests)

### Milestone 3: React Frontend - COMPLETE
- [x] Vite + React + TypeScript + MUI v9 + React Query
- [x] Pages: Employees, Shifts, TipEntryForm, TipEntryList, TipEntryDetail, SupportConfig, Dashboard
- [x] 29 files, builds clean

### Milestone 4: Phase 4 & 6 API Gaps + Frontend Polish - COMPLETE
- [x] Remove live tip preview (replaced with explicit "Preview Tips" button)
- [x] Employee rate history endpoint (GET /employees/:id/rate-history)
- [x] Dedicated rate update endpoint (POST /employees/:id/update-rate with effectiveDate)
- [x] hourlyRate removed from PATCH /employees/:id (forward-only rate changes)
- [x] Frontend: "Rate Since" column on EmployeesPage, separate "Update Rate" dialog
- [x] Frontend: EmployeeDialog no longer allows rate editing inline
- [x] Shift max-10 validation on create
- [x] Shift usage check on delete (blocks if referenced by active tip entries)
- [x] Support staff config history endpoint (GET /config/support-staff/history)
- [x] Support staff config effectiveDate field
- [x] Tip entry edit via PATCH (creates new entry, soft-deletes old with replacedById)
- [x] Force override on tip entry create (?force=true)
- [x] Tip entry list pagination (page, limit) and date filtering (start_date, end_date)
- [x] Config changes are forward-only (TipCalculation snapshots supportTipsGiven/Received/snapshotSupportPct)
- [x] Employee rate changes are forward-only (TipCalculation snapshots snapshotHourlyRate)
- [x] Closing drawer >= starting + cash_sales validation (Zod refine)
- [x] Employee search (?search=name) on GET /employees
- [x] Audit log table (AuditLog model) + audit entries on all mutations
- [x] Audit log API (GET /audit, GET /audit/:entityType/:entityId)
- [x] Tenant isolation tests (8 tests verifying cross-tenant data is invisible)
- [x] 74 tests passing (23 unit + 51 integration)

### Milestone 5: AWS Deployment - COMPLETE
- [x] Backend deployed to Lambda (Node.js 20, serverless-http wrapping Express)
- [x] PostgreSQL RDS (db.t3.micro, us-east-1) — schema-postgres.prisma with pg adapter
- [x] Frontend deployed to S3 + CloudFront (https://d3vrbd8qbym3pv.cloudfront.net)
- [x] API Gateway → Lambda wired via Terraform
- [x] Lambda admin action handlers (migrate, seed, updatePasswordHash) gated by LAMBDA_ADMIN_SECRET
- [x] DB migrations run via Lambda invocation (Prisma CLI unavailable in Lambda due to @prisma/engines)
- [x] build-lambda.sh: prunes unused packages (SQLite, dev tools) → 43MB zip

### Milestone 6: Security Hardening - COMPLETE (2026-04-26)
- [x] helmet (security headers), CORS locked to CloudFront origin, 1MB body limit
- [x] Login rate limiting: 10 req / 15 min per IP
- [x] JWT_SECRET required at startup; token expiry 24h → 8h
- [x] Password validation: min 8 / max 128 chars
- [x] force-override flag restricted to ADMIN role only
- [x] Stack traces truncated in error logs
- [x] Magic link token removed from CloudWatch logs
- [x] LAMBDA_ADMIN_SECRET required for all direct Lambda admin actions

### Milestone 7: User Management + Support Account - COMPLETE (2026-04-26)
- [x] GET/POST /api/v1/users — ADMIN-only manager CRUD
- [x] DELETE /api/v1/users/:id — soft-deactivate (isActive=false)
- [x] PATCH /api/v1/users/:id/password — admin resets manager password
- [x] Frontend: Managers page (ADMIN-only nav item), add/remove/reset-password dialogs
- [x] Developer support account (support@tippooling.app, ADMIN) seeded per tenant
- [x] Support credentials stored in AWS Secrets Manager (tip-pooling/support-account)

### Milestone 8: Tip Email Notifications - COMPLETE (2026-04-26)
- [x] publishedAt field added to tip_entries (null=draft, set=published)
- [x] POST /api/v1/tips/entries/:id/publish — marks published, sends SES emails
- [x] Edits blocked on published entries
- [x] email.service.ts: AWS SES with HTML + plain text templates
- [x] FROM_EMAIL=ameet.rawal1@gmail.com (placeholder; SES verified), FROM_NAME, RESTAURANT_NAME env vars
- [x] Frontend: Draft/Published badge on tip entries list
- [x] Frontend: "Publish & Send Emails" button on detail page with confirm dialog
- [x] Email failures logged but do not block publish response
- [ ] SES production access not yet requested (sandbox: can only send to verified addresses)
- [ ] Real domain + FROM_EMAIL to be configured per tenant at onboarding

### Milestone 10: Employee Login Experience - COMPLETE (2026-04-27)
- [x] Tip history window: 30 → 90 days
- [x] Tip email includes "View My Tip History" button linking to app login page
- [x] Login page split: Admin/Manager (email+password) and Employee (magic link) sections
- [x] VerifyPage redirects by role: employees → /my-tips, admin/manager → /tips
- [x] Deactivated employees blocked at both magic link request AND verify steps (isActive check)

---

This plan tracks all implementation steps for the tip pooling management system based on the revised PRD and TDD. Update this file as you complete each step.

**Key Updates in This Version:**
- Added cash sales field to tip calculation
- Enhanced magic link security with rate limiting
- Added timezone handling requirements
- Added live calculation preview feature
- Updated database schema with partial unique indexes
- Enhanced tip calculation algorithm with validation
- Added comprehensive test scenarios

---

## Phase 1: Foundation & Infrastructure (Weeks 1-2)

### AWS Account Setup
- [ ] Create AWS account and configure billing alerts ($50, $100, $150)
- [ ] Set up IAM users and roles with least privilege access
- [ ] Configure AWS CLI and credentials locally
- [ ] Enable MFA for root and admin accounts

### Network Infrastructure (Terraform)
- [ ] Create VPC with public and private subnets (10.0.0.0/16)
- [ ] Set up Internet Gateway and NAT Gateway
- [ ] Configure security groups for Lambda, RDS, and ALB
- [ ] Create VPC endpoints for Lambda-RDS connectivity
- [ ] Document network architecture diagram

### Database Setup
- [ ] Create Amazon RDS PostgreSQL 15 instance (start with db.t3.micro single-AZ for dev)
- [ ] Configure database security group (private subnet access only)
- [ ] Set up automated backups (6-hour interval, 7-day retention)
- [ ] Enable point-in-time recovery
- [ ] Store database credentials in AWS Secrets Manager
- [ ] Configure connection pooling strategy (Prisma: connection_limit = 5)
- [ ] Document when to add RDS Proxy (Lambda executions > 50 or connection errors)

### Terraform Infrastructure as Code
- [ ] Initialize Terraform project structure (`terraform/`, modules)
- [ ] Create modules: network, rds, lambda, api-gateway, cognito, s3, cloudfront, ses
- [ ] Write backend configuration (S3 for state, DynamoDB for locking)
- [ ] Create environment configs: dev, staging, production
- [ ] Add data source for current AWS region and availability zones
- [ ] Test infrastructure deployment to dev environment
- [ ] Document Terraform commands in README

### Authentication Service (AWS Cognito)
- [ ] Create AWS Cognito User Pool for Admin/Manager authentication
- [ ] Configure password policies (12+ chars, uppercase, lowercase, number, special char)
- [ ] Set session timeout (30 min Admin/Manager, 15 min Employee)
- [ ] Create Cognito app client for frontend
- [ ] Configure user attributes (email, name, tenant_id custom attribute)
- [ ] Test Cognito sign-up and sign-in flows

### CI/CD Pipeline (GitHub Actions)
- [ ] Create GitHub repository and push initial code
- [ ] Set up branch protection rules (main: require PR, 1 approval, status checks)
- [ ] Create CI workflow (.github/workflows/ci.yml): lint, type-check, test
- [ ] Create CD workflow (.github/workflows/deploy.yml): build, deploy to dev/staging/prod
- [ ] Configure GitHub secrets (AWS credentials, database URL)
- [ ] Set up automated deployment on merge to main (dev), staging (staging branch), prod (tags)
- [ ] Test CI/CD pipeline with hello-world commit

### Monitoring & Logging
- [ ] Configure CloudWatch log groups for all Lambda functions
- [ ] Create CloudWatch dashboard with key metrics (Lambda errors, RDS CPU, API 5xx, P95 latency)
- [ ] Set up CloudWatch alarms (Lambda error rate > 1%, RDS CPU > 80%, API 5xx > 5)
- [ ] Configure SNS topic for alert notifications (email/Slack)
- [ ] Enable AWS X-Ray for distributed tracing
- [ ] Test alarm triggers and notifications

### Hello World Deployment
- [ ] Create "Hello World" Lambda function (Node.js 20)
- [ ] Deploy Lambda via API Gateway (GET /health)
- [ ] Test API endpoint returns 200 OK with JSON response
- [ ] Deploy static React "Hello World" to S3
- [ ] Configure CloudFront distribution for frontend
- [ ] Test frontend loads successfully via CloudFront URL
- [ ] (Optional) Configure custom domain with Route 53 + ACM SSL certificate

---

## Phase 2: Database Schema & Core Backend (Weeks 3-4)

### Backend Project Setup
- [ ] Initialize Node.js 20 + TypeScript 5.x project
- [ ] Configure tsconfig.json (strict mode, ES2022, moduleResolution: bundler)
- [ ] Set up ESLint (@typescript-eslint) and Prettier
- [ ] Install core dependencies: express, @prisma/client, zod, jsonwebtoken, bcrypt
- [ ] Install dev dependencies: jest, @types/jest, supertest, ts-jest, @types/node
- [ ] Create folder structure: src/routes, src/services, src/middleware, src/types, src/utils
- [ ] Set up jest.config.js for TypeScript

### Prisma Database Schema
- [ ] Initialize Prisma (`npx prisma init`)
- [ ] Define tenants table with timezone field
- [ ] Define users table with role enum (ADMIN, MANAGER, EMPLOYEE)
- [ ] Define employees table with user_id FK and email index
- [ ] Define employee_rate_history table with effective_date
- [ ] Define shifts table (max 10 per tenant)
- [ ] Define support_staff_config table with effective_date and percentage validation
- [ ] Define tip_entries table with cash_sales field (DEFAULT 0)
- [ ] Add computed columns: cash_tips = closing - starting - cash_sales
- [ ] Add computed columns: total_tips = cash_tips + electronic_tips
- [ ] Create partial unique index: idx_tip_entries_unique_active (WHERE is_deleted = FALSE)
- [ ] Define tip_calculations table with all calculation fields
- [ ] Define shift_assignments junction table
- [ ] Define magic_link_tokens table with expiry, is_used, email/IP indexes
- [ ] Define audit_logs table with JSONB old_values/new_values

### Database Migrations
- [ ] Create initial migration (`npx prisma migrate dev --name init`)
- [ ] Review generated SQL for correctness
- [ ] Run migration against dev database
- [ ] Generate Prisma Client (`npx prisma generate`)
- [ ] Create seed script (src/seed.ts) with test data
- [ ] Run seed script (`npx prisma db seed`)
- [ ] Open Prisma Studio (`npx prisma studio`) and verify schema

### Middleware Development
- [ ] Create JWT validation middleware (verifyJWT)
  - [ ] Extract token from Authorization header
  - [ ] Verify token signature with Cognito public keys
  - [ ] Decode token and attach user to req.user
  - [ ] Handle expired tokens (401 Unauthorized)
- [ ] Create role authorization middleware (requireRole)
  - [ ] Check req.user.role against required roles
  - [ ] Return 403 Forbidden if unauthorized
- [ ] Create tenant isolation middleware (enforceTenantScope)
  - [ ] Extract tenant_id from JWT token
  - [ ] Attach to req.tenantId
  - [ ] Automatically scope all Prisma queries by tenant_id
- [ ] Write unit tests for all middleware (jest + supertest)
- [ ] Test middleware with mock JWT tokens

### Core API Infrastructure
- [ ] Create Express app with JSON body parser (limit: 10mb)
- [ ] Set up request logging middleware (morgan or custom)
- [ ] Create error handling middleware (catch all errors, return consistent format)
- [ ] Create validation middleware (validateRequest with Zod schemas)
- [ ] Create API versioning structure (/api/v1/*)
- [ ] Set up CORS configuration (allow frontend domain)
- [ ] Create health check endpoint (GET /health)
- [ ] Create standardized response format ({ success, data, error })

---

## Phase 3: Tenant & User Management APIs (Week 5)

### Tenant Management API
- [ ] POST /api/v1/tenants - Create tenant
  - [ ] Zod schema: name (string), address (string), timezone (IANA string)
  - [ ] Validate timezone against known list
  - [ ] Create tenant record
  - [ ] Return 201 Created with tenant data
- [ ] GET /api/v1/tenants - List all tenants (Admin only)
  - [ ] Pagination: ?page=1&limit=50
  - [ ] Filter: ?search=name
  - [ ] Return paginated results
- [ ] GET /api/v1/tenants/:id - Get tenant details
  - [ ] Enforce tenant isolation (users can only access their own tenant)
  - [ ] Return 404 if not found or unauthorized
- [ ] PATCH /api/v1/tenants/:id - Update tenant
  - [ ] Allow updating: name, address, timezone
  - [ ] Create audit log entry
  - [ ] Return updated tenant
- [ ] DELETE /api/v1/tenants/:id - Soft delete tenant (Admin only)
  - [ ] Set is_deleted = true, deleted_at = NOW()
  - [ ] Create audit log entry
  - [ ] Return 204 No Content
- [ ] Write integration tests for all endpoints
- [ ] Test tenant isolation (Manager from Tenant A cannot access Tenant B)

### User Management API
- [ ] POST /api/v1/users - Create user (Admin/Manager)
  - [ ] Zod schema: email, password, role (ADMIN/MANAGER/EMPLOYEE), tenant_id
  - [ ] Hash password with bcrypt (10 rounds)
  - [ ] Create Cognito user
  - [ ] Create database user record
  - [ ] Return 201 Created (exclude password hash)
- [ ] GET /api/v1/users - List users (filtered by tenant)
  - [ ] Pagination and search
  - [ ] Filter by role: ?role=MANAGER
  - [ ] Return users for current tenant only
- [ ] GET /api/v1/users/:id - Get user details
  - [ ] Enforce tenant isolation
  - [ ] Exclude password hash from response
- [ ] PATCH /api/v1/users/:id - Update user
  - [ ] Allow updating: name, email, role (Admin only)
  - [ ] If password changed: hash and update Cognito + database
  - [ ] Create audit log entry
- [ ] DELETE /api/v1/users/:id - Deactivate user
  - [ ] Set is_active = false
  - [ ] Disable Cognito user
  - [ ] Create audit log entry
- [ ] Write integration tests
- [ ] Test RBAC (Manager cannot create Admin users)

---

## Phase 4: Employee Management & Configuration APIs (Week 6)

### Employee Management API
- [x] POST /api/v1/employees - Create employee
  - [x] Zod schema: name, email, role (SERVER/BUSSER/EXPEDITOR), hourly_rate
  - [x] Validate hourly_rate > 0
  - [x] Check for duplicate email within tenant
  - [x] Create employee record (user_id = NULL initially)
  - [x] Create initial rate history record
  - [x] Return 201 Created
- [x] GET /api/v1/employees - List employees
  - [x] Filter: ?is_active=true
  - [x] Search: ?search=name
  - [ ] Pagination
  - [x] Return employees for current tenant only
- [x] GET /api/v1/employees/:id - Get employee details
  - [x] Include current hourly rate
  - [x] Enforce tenant isolation
- [x] PATCH /api/v1/employees/:id - Update employee
  - [x] Allow updating: name, email, role, is_active
  - [x] Do NOT allow direct hourly_rate update (use separate endpoint)
- [x] POST /api/v1/employees/:id/update-rate - Update hourly rate
  - [x] Zod schema: new_rate, effective_date
  - [x] Insert new row in employee_rate_history
  - [x] Update employee.hourly_rate
  - [x] Create audit log entry
- [x] GET /api/v1/employees/:id/rate-history - Get rate history
  - [x] Return all rate history records ordered by effective_date DESC
- [x] DELETE /api/v1/employees/:id - Soft delete employee
  - [x] Set is_active = false, deleted_at = NOW()
  - [x] Create audit log entry
- [x] Write integration tests
- [x] Test rate history logic with multiple effective dates

### Shift Configuration API
- [x] POST /api/v1/shifts - Create shift
  - [x] Zod schema: name (string, 2-50 chars)
  - [x] Validate max 10 shifts per tenant
  - [x] Create shift record
  - [x] Return 201 Created
- [x] GET /api/v1/shifts - List shifts (active only)
  - [x] Filter by is_active
  - [x] Return shifts for current tenant only
- [x] PATCH /api/v1/shifts/:id - Update shift name
  - [x] Update name
  - [x] Create audit log entry
- [x] DELETE /api/v1/shifts/:id - Soft delete shift
  - [x] Set is_active = false, deleted_at = NOW()
  - [x] Verify no active tip entries reference this shift
  - [x] Create audit log entry
- [x] Write integration tests
- [x] Test max 10 shifts validation

### Support Staff Configuration API
- [x] GET /api/v1/config/support-staff - Get current config
  - [x] Query effective_date <= TODAY, order by effective_date DESC, limit 1
  - [x] Return current Busser % and Expeditor %
- [x] POST /api/v1/config/support-staff - Update config
  - [x] Zod schema: busser_percentage (0-50), expeditor_percentage (0-50), effective_date
  - [x] Validate percentages in range
  - [x] Insert new config record
  - [x] Create audit log entry
  - [x] Return 201 Created
- [x] GET /api/v1/config/support-staff/history - Get config history
  - [x] Return all config records ordered by effective_date DESC
  - [ ] Pagination (not yet added)
- [x] Write integration tests
- [x] Test effective_date logic (use config for correct date)

---

## Phase 5: Tip Calculation Service (Week 7)

### Tip Calculation Algorithm
- [x] Create TipCalculationService class (src/services/tip-calculation.service.ts)
- [x] Implement input validation
  - [x] Validate totalTipPool >= 0
  - [x] Validate employees.length > 0
  - [x] Validate at least one SERVER exists
  - [x] Validate totalServerHours > 0
  - [x] Validate hoursWorked: 0.5 <= hours <= 16
- [x] Implement server tip proration
  - [x] Calculate: baseTips = (hoursWorked / totalServerHours) × totalTipPool
  - [x] Round to 2 decimal places
  - [x] Tips pooled across ALL shifts (single pool)
- [x] Implement support staff tip calculation
  - [x] Find servers who worked same shifts
  - [x] Calculate proportion of server tips from shared shifts
  - [x] Apply support staff percentage
  - [x] Deduct from server tips
- [x] Implement support staff cap enforcement
  - [x] Find highest earning server on shared shifts
  - [x] If support tips > highest server tip, cap to highest
  - [x] Return excess tips to servers proportionally
- [x] Implement rounding remainder handling
  - [x] Calculate totalDistributed vs. totalTipPool
  - [x] Add difference to highest earner (within $0.01 tolerance)
- [x] Calculate total compensation
  - [x] hourlyPay = hoursWorked × hourlyRate
  - [x] totalPay = hourlyPay + finalTips
  - [x] effectiveHourlyRate = totalPay / hoursWorked
  - [x] Round all monetary values to 2 decimals

### Tip Calculation Unit Tests
- [x] Test TC-CALC-001: Single server receives 100% of tips
- [x] Test TC-CALC-002: Two servers equal hours split 50/50
- [x] Test TC-CALC-003: Two servers unequal hours (2:1 ratio)
- [x] Test TC-CALC-004: Server works multiple shifts (tips by total hours)
- [x] Test TC-CALC-005: Busser receives percentage from servers on same shift
- [x] Test TC-CALC-006: Support staff cap applied (tips exceed highest server)
- [x] Test TC-CALC-007: Support staff cap not needed (tips below highest)
- [x] Test TC-CALC-008: Multiple support staff on same shift
- [x] Test TC-CALC-009: Rounding: $10 split 3 ways = $3.33, $3.33, $3.34
- [x] Test TC-CALC-010: Total distributed equals tip pool (±$0.01)
- [x] Test TC-CALC-011: Zero servers throws error
- [x] Test TC-CALC-012: Zero hours throws error
- [x] Test TC-CALC-013: Negative tip pool throws error
- [x] Test TC-CALC-014: Negative drawer balance validation error
- [x] Test TC-CALC-015: Employee works > 16 hours validation error
- [x] Test TC-CALC-016: Same employee listed twice validation error
- [x] Test TC-CALC-017: Support staff with no shared shifts receives $0 from that server
- [x] Test TC-CALC-018: Complex 3-way scenario (2 servers, 1 busser)
- [x] Test TC-CALC-019: Decimal hours (4.5, 7.25)
- [x] Test TC-CALC-020: Large tip amount ($10,000+) precision test
- [x] Achieve 90%+ code coverage for calculation service

---

## Phase 6: Tip Entry API (Week 8)

### Tip Entry API Endpoints
- [x] POST /api/v1/tips/preview - Live preview calculation (does NOT save)
  - [x] Zod schema: entry_date, starting_drawer, closing_drawer, cash_sales, electronic_tips, employees[]
  - [x] Validate cash_sales >= 0
  - [x] Validate closing_drawer >= starting_drawer + cash_sales
  - [x] Calculate cash_tips = closing - starting - cash_sales
  - [x] Calculate total_tips = cash_tips + electronic_tips
  - [x] Call TipCalculationService
  - [x] Return calculation results (do NOT persist)
  - [x] Used by frontend for real-time preview
- [x] POST /api/v1/tips/entries - Create daily tip entry
  - [x] Check for duplicate active entry for same date (return 409 Conflict)
  - [x] Allow override with ?force=true query param (confirmation required)
  - [x] Validate all inputs with Zod
  - [x] Start database transaction
  - [x] Create tip_entries record
  - [x] Call TipCalculationService
  - [x] Insert tip_calculations records
  - [x] Insert shift_assignments records
  - [x] Create audit log entry
  - [x] Commit transaction
  - [x] Return 201 Created with entry and calculations
- [x] GET /api/v1/tips/entries - List all entries
  - [x] Pagination: ?page=1&limit=50
  - [x] Date filter: ?start_date=2025-01-01&end_date=2025-12-31
  - [ ] Employee search: ?employee_name=John
  - [x] Order by entry_date DESC
  - [x] Return only entries for current tenant
  - [ ] Include summary: total tips, employee count, manager name
- [x] GET /api/v1/tips/entries/:id - Get entry with calculations
  - [x] Include tip_entries record
  - [x] Include all tip_calculations with employee details
  - [x] Include shift_assignments
  - [x] Enforce tenant isolation
  - [x] Return 404 if not found or unauthorized
- [x] PATCH /api/v1/tips/entries/:id - Edit entry (creates new record)
  - [x] Start transaction
  - [x] Create new tip_entries record with updated data
  - [x] Soft delete old entry (is_deleted = true, deleted_at = NOW())
  - [x] Set old entry.replaced_by_id = new entry ID
  - [x] Create new tip_calculations
  - [x] Create audit log with old/new values (JSON)
  - [x] Commit transaction
  - [x] Return 200 OK with new entry
- [x] DELETE /api/v1/tips/entries/:id - Soft delete entry
  - [x] Set is_deleted = true, deleted_at = NOW()
  - [x] Create audit log entry
  - [x] Return 204 No Content
- [ ] GET /api/v1/tips/entries/:id/calculations - Get detailed breakdown
  - [ ] Return all calculations for entry
  - [ ] Include employee details (name, role)
  - [ ] Include shift details

### Tip Entry Integration Tests
- [x] Test create entry successfully
- [x] Test duplicate entry prevention (409 Conflict)
- [x] Test override duplicate with ?force=true
- [x] Test cash sales calculation (with and without sales)
- [x] Test validation errors (closing < starting + sales)
- [x] Test preview endpoint (does not persist)
- [x] Test edit creates new record and soft deletes old
- [x] Test audit trail on edit
- [x] Test soft delete
- [x] Test pagination and filters
- [x] Test tenant isolation (8 tests)

---

## Phase 7: Magic Link Authentication (Week 9)

### Magic Link Backend
- [ ] Create MagicLinkService class (src/services/magic-link.service.ts)
- [ ] POST /api/v1/auth/magic-link - Generate token and send email
  - [ ] Zod schema: email (valid email format)
  - [ ] Lookup employee by email in current tenant
  - [ ] Return 404 if employee not found
  - [ ] Check rate limits:
    - [ ] Email: Max 3 requests per email per hour (check magic_link_tokens table)
    - [ ] IP: Max 10 requests per IP per hour
  - [ ] Return 429 Too Many Requests if limit exceeded
  - [ ] Generate unique token (UUID v4)
  - [ ] Set expires_at = NOW() + 15 minutes
  - [ ] Insert into magic_link_tokens table
  - [ ] Send email via Amazon SES with magic link
  - [ ] Return 200 OK with message "Check your email"
- [ ] GET /api/v1/auth/verify-magic-link - Validate token
  - [ ] Extract token from query param ?token=xxx
  - [ ] Lookup token in magic_link_tokens table
  - [ ] Validate: token exists, not expired, not used
  - [ ] Return 401 if invalid, expired, or used
  - [ ] Mark token as used (is_used = true, used_at = NOW())
  - [ ] Create/update user record for employee (if user_id is NULL)
  - [ ] Update employee.user_id with user ID
  - [ ] Generate JWT token (role=EMPLOYEE, tenant_id, employee_id)
  - [ ] Return 200 OK with JWT token
- [ ] Create cleanup job to delete tokens older than 24 hours

### Rate Limiting Implementation
- [ ] Create RateLimitService class
- [ ] Implement email rate limit check (query magic_link_tokens by email, created_at > NOW() - 1 hour, count)
- [ ] Implement IP rate limit check (query by ip_address, created_at > NOW() - 1 hour, count)
- [ ] Add Redis caching for rate limit counters (optional optimization)
- [ ] Test rate limiting with concurrent requests

### Email Service (Amazon SES)
- [ ] Configure Amazon SES in AWS (verify domain or email)
- [ ] Create email templates for magic link
- [ ] Implement sendMagicLinkEmail function
  - [ ] Subject: "Login to [Tenant Name] - Tip History"
  - [ ] Body: HTML email with magic link button
  - [ ] Include link expiry notice (15 minutes)
  - [ ] Include tenant name and employee name
- [ ] Test email delivery to real email addresses
- [ ] Handle SES errors gracefully

### Magic Link Unit Tests
- [ ] Test generate magic link successfully
- [ ] Test employee not found (404)
- [ ] Test email rate limit (3 per hour)
- [ ] Test IP rate limit (10 per hour)
- [ ] Test verify valid token
- [ ] Test expired token rejected (401)
- [ ] Test used token rejected (401)
- [ ] Test invalid token rejected (401)
- [ ] Test token marked as used after verification
- [ ] Test JWT token generated with correct claims

---

## Phase 8: Frontend - Project Setup (Week 10)

### React Project Initialization
- [ ] Create React app with Vite + TypeScript
  - [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Install dependencies:
  - [ ] UI: @mui/material @emotion/react @emotion/styled @mui/x-date-pickers
  - [ ] Routing: react-router-dom
  - [ ] Forms: react-hook-form @hookform/resolvers zod
  - [ ] Data fetching: @tanstack/react-query axios
  - [ ] Charts: recharts
  - [ ] Date utilities: date-fns date-fns-tz
- [ ] Install dev dependencies:
  - [ ] Testing: vitest @testing-library/react @testing-library/jest-dom
  - [ ] Linting: eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
- [ ] Configure tsconfig.json (strict mode, path aliases)
- [ ] Set up ESLint and Prettier
- [ ] Create folder structure:
  - [ ] src/components (shared components)
  - [ ] src/pages (page components)
  - [ ] src/hooks (custom hooks)
  - [ ] src/services (API client)
  - [ ] src/types (TypeScript types)
  - [ ] src/contexts (React contexts)
  - [ ] src/utils (utility functions)

### Environment Configuration
- [ ] Create .env.local for local development
  - [ ] VITE_API_BASE_URL=http://localhost:3000/api/v1
  - [ ] VITE_COGNITO_USER_POOL_ID=xxx
  - [ ] VITE_COGNITO_CLIENT_ID=xxx
- [ ] Create .env.staging for staging
- [ ] Create .env.production for production
- [ ] Add .env.* to .gitignore

### API Client Setup
- [ ] Create axios instance (src/services/api.ts)
  - [ ] Set baseURL from environment
  - [ ] Add request interceptor to attach JWT token
  - [ ] Add response interceptor to handle errors
  - [ ] Handle 401 (redirect to login)
  - [ ] Handle 403 (show unauthorized message)
  - [ ] Handle network errors
- [ ] Create API service modules:
  - [ ] src/services/auth.service.ts
  - [ ] src/services/tenant.service.ts
  - [ ] src/services/employee.service.ts
  - [ ] src/services/tip.service.ts
  - [ ] src/services/report.service.ts
- [ ] Configure React Query provider with defaults

### TypeScript Type Definitions
- [ ] Create types from database schema
  - [ ] src/types/tenant.types.ts
  - [ ] src/types/user.types.ts
  - [ ] src/types/employee.types.ts
  - [ ] src/types/tip-entry.types.ts
  - [ ] src/types/tip-calculation.types.ts
  - [ ] src/types/shift.types.ts
  - [ ] src/types/api.types.ts (APIResponse, PaginatedResponse)
- [ ] Ensure types match Zod schemas from backend

---

## Phase 9: Frontend - Authentication & Layout (Week 11)

### Authentication Context
- [ ] Create AuthContext (src/contexts/AuthContext.tsx)
  - [ ] State: user, token, isAuthenticated, isLoading
  - [ ] Methods: login, logout, refreshToken
  - [ ] Store token in httpOnly cookie or secure localStorage
  - [ ] Auto-refresh token before expiry
- [ ] Create useAuth hook (src/hooks/useAuth.ts)
- [ ] Integrate with AWS Cognito for Admin/Manager login
- [ ] Test token refresh logic

### Login Pages
- [ ] Create AdminManagerLoginPage (src/pages/auth/AdminManagerLogin.tsx)
  - [ ] Email and password fields
  - [ ] "Remember me" checkbox
  - [ ] "Forgot password" link (Cognito forgot password flow)
  - [ ] Form validation with Zod
  - [ ] Call Cognito sign-in API
  - [ ] Store JWT token
  - [ ] Redirect to dashboard based on role
- [ ] Create EmployeeLoginPage (src/pages/auth/EmployeeLogin.tsx)
  - [ ] Email field only
  - [ ] "Send Magic Link" button
  - [ ] Call POST /api/v1/auth/magic-link
  - [ ] Show "Check your email" message
  - [ ] Display rate limit errors (429)
- [ ] Create MagicLinkVerifyPage (src/pages/auth/MagicLinkVerify.tsx)
  - [ ] Extract token from URL query params
  - [ ] Call GET /api/v1/auth/verify-magic-link
  - [ ] Store JWT token
  - [ ] Redirect to employee dashboard
  - [ ] Handle errors (expired, used, invalid)

### App Layout
- [ ] Create AppLayout component (src/components/layout/AppLayout.tsx)
  - [ ] Header with logo, tenant name, user name, logout button
  - [ ] Sidebar navigation (collapsible)
  - [ ] Main content area
  - [ ] Responsive design (hamburger menu on mobile)
- [ ] Create Navigation component (src/components/layout/Navigation.tsx)
  - [ ] Role-based menu items:
    - [ ] Admin: Tenants, Users, Employees, Shifts, Config, Tips, Reports, Audit
    - [ ] Manager: Employees, Tips, Reports
    - [ ] Employee: My Tips
  - [ ] Active route highlighting
  - [ ] Icons for each menu item (MUI icons)

### Protected Routes
- [ ] Create ProtectedRoute component (src/components/auth/ProtectedRoute.tsx)
  - [ ] Check isAuthenticated
  - [ ] Redirect to login if not authenticated
  - [ ] Check user role against allowedRoles prop
  - [ ] Show 403 if unauthorized
- [ ] Set up React Router with protected routes
  - [ ] /login - Public
  - [ ] /employee-login - Public
  - [ ] /verify-magic-link - Public
  - [ ] /admin/* - Admin only
  - [ ] /manager/* - Manager only
  - [ ] /employee/* - Employee only
- [ ] Test route guards (attempt access without auth, wrong role)

### Dashboard Shells
- [ ] Create AdminDashboard (src/pages/admin/AdminDashboard.tsx)
  - [ ] Summary cards: Total tenants, Total users, System health
  - [ ] Recent activity feed
- [ ] Create ManagerDashboard (src/pages/manager/ManagerDashboard.tsx)
  - [ ] Summary cards: Today's tips, Employees on shift, Recent entries
  - [ ] Quick action buttons (New Tip Entry, View Reports)
- [ ] Create EmployeeDashboard (src/pages/employee/EmployeeDashboard.tsx)
  - [ ] Summary cards: This week's tips, This month's tips, Avg hourly rate
  - [ ] 30-day tip history preview

---

## Phase 10: Frontend - Tip Entry Form (Week 12)

### Tip Entry Form UI
- [ ] Create TipEntryForm component (src/pages/manager/TipEntryForm.tsx)
- [ ] Timezone handling:
  - [ ] Display current date in tenant's timezone
  - [ ] Date picker with timezone conversion
  - [ ] Allow past entries (up to 30 days back)
  - [ ] Allow future entries (up to 2 days ahead)
- [ ] Drawer and tips section:
  - [ ] Starting drawer input (decimal, positive)
  - [ ] Closing drawer input (decimal, >= starting)
  - [ ] Cash sales input (decimal, >= 0, defaults to 0)
  - [ ] Display calculated cash tips (closing - starting - cash_sales)
  - [ ] Electronic tips input (decimal, >= 0)
  - [ ] Display total tip pool (cash + electronic)
- [ ] Duplicate entry check:
  - [ ] On date select, check if entry exists for that date
  - [ ] Show warning dialog: "Entry exists. Edit existing or override?"
  - [ ] Options: "Edit Existing", "Force Override", "Cancel"
- [ ] Employee section:
  - [ ] "Add Employee" button opens dialog
  - [ ] Employee selection (searchable dropdown)
  - [ ] Role selection (SERVER, BUSSER, EXPEDITOR)
  - [ ] Shift multi-select (checkboxes)
  - [ ] Hours worked input (decimal, 0.5-16)
  - [ ] Validate at least one SERVER required
  - [ ] Show employee list table with edit/remove actions
  - [ ] Prevent duplicate employee entries
- [ ] Form validation with Zod schema
- [ ] Show validation errors inline

### Live Calculation Preview
- [ ] Add "Preview Calculation" section (always visible)
- [ ] Call POST /api/v1/tips/preview on any field change (debounced 500ms)
- [ ] Display preview results in collapsible table:
  - [ ] Columns: Name, Role, Shifts, Hours, Hourly Pay, Tips, Total Pay, Effective Rate
  - [ ] Highlight support staff if cap applied
  - [ ] Show summary row: Total tips distributed, Total hours
- [ ] Display "PREVIEW - Not Saved" warning badge
- [ ] Show loading indicator during calculation
- [ ] Handle calculation errors gracefully

### Tip Entry Submission
- [ ] "Confirm & Save" button
- [ ] Call POST /api/v1/tips/entries
- [ ] Show loading state during submission
- [ ] On success:
  - [ ] Show success snackbar notification
  - [ ] Redirect to entry detail page or list
- [ ] On error:
  - [ ] Show error message (duplicate entry, validation errors)
  - [ ] Keep form data intact for correction
- [ ] Test form with various scenarios

### Mobile Responsiveness
- [ ] Test form on mobile devices (viewport width 375px-768px)
- [ ] Ensure inputs are touch-friendly (min height 44px)
- [ ] Tables scroll horizontally on small screens
- [ ] Buttons stack vertically on mobile
- [ ] Test keyboard appearance on iOS/Android

---

## Phase 11: Frontend - Employee & Configuration Management (Week 13)

### Employee Management UI
- [ ] Create EmployeeList page (src/pages/admin/EmployeeList.tsx)
  - [ ] Table columns: Name, Email, Role, Hourly Rate, Status, Actions
  - [ ] Search by name/email
  - [ ] Filter by role (dropdown)
  - [ ] Filter by status (active/inactive toggle)
  - [ ] Pagination controls
  - [ ] "Add Employee" button
  - [ ] Edit icon button (opens dialog)
  - [ ] Delete icon button (soft delete with confirmation)
- [ ] Create EmployeeFormDialog component
  - [ ] Fields: Name, Email, Role, Hourly Rate
  - [ ] Validation: Email format, Rate > 0
  - [ ] Mode: Create or Edit
  - [ ] Submit calls POST or PATCH endpoint
- [ ] Create RateHistoryDialog component
  - [ ] Table: Effective Date, Hourly Rate, Updated By, Updated At
  - [ ] "Update Rate" button opens form
  - [ ] New rate form: Rate, Effective Date
  - [ ] Submit calls POST /api/v1/employees/:id/update-rate
- [ ] Test CRUD operations
- [ ] Test search and filters

### Shift Configuration UI
- [ ] Create ShiftList page (src/pages/admin/ShiftList.tsx)
  - [ ] Table columns: Shift Name, Status, Actions
  - [ ] "Add Shift" button
  - [ ] Edit icon button
  - [ ] Delete icon button (soft delete with confirmation)
  - [ ] Validate max 10 shifts per tenant
- [ ] Create ShiftFormDialog component
  - [ ] Field: Shift Name (2-50 chars)
  - [ ] Validation
  - [ ] Submit calls POST or PATCH endpoint
- [ ] Test CRUD operations
- [ ] Test max 10 shifts validation

### Support Staff Configuration UI
- [ ] Create SupportStaffConfigPage (src/pages/admin/SupportStaffConfig.tsx)
  - [ ] Display current configuration:
    - [ ] Busser percentage
    - [ ] Expeditor percentage
    - [ ] Effective date
  - [ ] "Update Configuration" button opens form
  - [ ] Form fields: Busser %, Expeditor %, Effective Date
  - [ ] Validation: 0-50% range
  - [ ] Submit calls POST /api/v1/config/support-staff
  - [ ] Configuration history table (expandable)
  - [ ] Test configuration updates
  - [ ] Test effective date logic

---

## Phase 12: Frontend - Tip History & Reporting (Week 14)

### Tip Entry List
- [ ] Create TipEntryList page (src/pages/manager/TipEntryList.tsx)
  - [ ] Table columns: Date, Manager, Total Tips, Employees, Status, Actions
  - [ ] Date range filter (start/end date pickers)
  - [ ] Employee name search
  - [ ] Sort by date (default: DESC)
  - [ ] Pagination (50 per page)
  - [ ] View icon button (navigate to detail page)
  - [ ] Edit icon button (navigate to edit form)
  - [ ] Delete icon button (soft delete with confirmation)
- [ ] Test filters and pagination
- [ ] Test timezone display (show dates in tenant timezone)

### Tip Entry Detail View
- [ ] Create TipEntryDetail page (src/pages/manager/TipEntryDetail.tsx)
  - [ ] Entry summary card:
    - [ ] Date, Manager, Created At
    - [ ] Starting Drawer, Closing Drawer, Cash Sales
    - [ ] Cash Tips, Electronic Tips, Total Tips
  - [ ] Calculation breakdown table:
    - [ ] Columns: Employee, Role, Shifts, Hours, Hourly Pay, Tips, Total Pay, Effective Rate
    - [ ] Highlight support staff with cap applied
  - [ ] Summary row: Total distributed, Total hours, Employee count
  - [ ] "Edit Entry" button (navigate to edit form)
  - [ ] "View Audit Trail" button (Admin only)
- [ ] Test data display and actions

### Tip Entry Edit
- [ ] Create TipEntryEditForm page (src/pages/manager/TipEntryEdit.tsx)
  - [ ] Pre-populate form with existing entry data
  - [ ] Show warning: "Editing creates a new version. Audit trail will be preserved."
  - [ ] Allow modification of all fields
  - [ ] Same validation as create form
  - [ ] On submit, call PATCH /api/v1/tips/entries/:id
  - [ ] Show success message
  - [ ] Redirect to updated entry detail page
- [ ] Test edit creates new record
- [ ] Test audit trail link

### Employee Dashboard & Tip History
- [ ] Create EmployeeTipHistory component (src/pages/employee/TipHistory.tsx)
  - [ ] Call GET /api/v1/employee/my-tips
  - [ ] Table columns: Date, Shifts, Hours, Tips, Hourly Pay, Total Pay, Effective Rate
  - [ ] Date range filter (within 30-day window)
  - [ ] Default: Last 30 days
  - [ ] Sort by date DESC
  - [ ] Monthly summary card:
    - [ ] Total tips, Total hours, Average effective rate
  - [ ] Display in tenant timezone
- [ ] Test 30-day restriction
- [ ] Test session timeout (15 minutes)

### Audit Log Viewer (Admin Only)
- [ ] Create AuditLogList page (src/pages/admin/AuditLogList.tsx)
  - [ ] Table columns: Timestamp, User, Action, Entity Type, Entity ID
  - [ ] Filter by entity type (dropdown)
  - [ ] Date range filter
  - [ ] Search by user name
  - [ ] Pagination (50 per page)
  - [ ] Click row to view old/new values
- [ ] Create AuditLogDetailDialog component
  - [ ] Display old_values and new_values (JSONB)
  - [ ] Diff view (highlight changes)
  - [ ] Show IP address and user agent
- [ ] Test audit trail for edited tip entries

---

## Phase 13: Reporting & CSV Export (Week 15)

### Report Backend APIs
- [ ] GET /api/v1/reports/daily/:date - Daily summary
  - [ ] Calculate: Total tips, Total hours, Employee count, Avg effective rate
  - [ ] Group by role (SERVER, BUSSER, EXPEDITOR)
  - [ ] Return JSON summary
- [ ] GET /api/v1/reports/weekly/:start-date - Weekly summary
  - [ ] Aggregate data for 7 days
  - [ ] Same metrics as daily
  - [ ] Include daily breakdown
- [ ] GET /api/v1/reports/monthly/:year/:month - Monthly summary
  - [ ] Aggregate data for month
  - [ ] Same metrics as daily
  - [ ] Include weekly breakdown
- [ ] POST /api/v1/reports/export - Generate CSV export
  - [ ] Zod schema: start_date, end_date (max 1 year range)
  - [ ] Query all tip entries and calculations in date range
  - [ ] Generate CSV with columns: Date, Employee, Role, Shifts, Hours, Tips, Hourly Pay, Total Pay, Effective Rate
  - [ ] Upload CSV to S3 bucket
  - [ ] Return signed URL (expires in 1 hour)
  - [ ] Handle large datasets (stream to S3)
- [ ] Test with large datasets (performance)

### Report Dashboard UI
- [ ] Create ReportDashboard page (src/pages/manager/ReportDashboard.tsx)
  - [ ] Date range selector (daily, weekly, monthly)
  - [ ] Summary cards: Total Tips, Total Hours, Avg Effective Rate, Employee Count
  - [ ] Line chart: Tips over time (Recharts)
  - [ ] Bar chart: Hours distribution by employee
  - [ ] Pie chart: Tip distribution by role
  - [ ] Table: Top earners for period
- [ ] Test chart rendering
- [ ] Test date range selection
- [ ] Test data accuracy

### CSV Export UI
- [ ] Create ExportDialog component (src/components/reports/ExportDialog.tsx)
  - [ ] Date range picker (start/end dates)
  - [ ] Validate max 1 year range
  - [ ] "Generate Export" button
  - [ ] Show loading indicator (can take 10-30 seconds for large datasets)
  - [ ] On completion, show "Download CSV" button with signed URL
  - [ ] Auto-download file on click
- [ ] Add "Export CSV" button to ReportDashboard
- [ ] Test export with 1 year of data
- [ ] Test download functionality

---

## Phase 14: Testing & Quality Assurance (Week 16-17)

### End-to-End Tests (Playwright)
- [ ] Set up Playwright test environment
- [ ] E2E Test 1: Manager complete workflow (TC-E2E-001)
  - [ ] Login → Create tip entry → View results → 17 steps
- [ ] E2E Test 2: Employee magic link login (TC-E2E-002)
  - [ ] Request link → Verify → View history → 12 steps
- [ ] E2E Test 3: Admin configuration (TC-E2E-003)
  - [ ] Configure shifts → Manager uses new shift → 16 steps
- [ ] E2E Test 4: Edit tip entry workflow (TC-E2E-004)
  - [ ] Edit entry → Verify audit trail → 15 steps
- [ ] E2E Test 5: Multi-shift complex scenario (TC-E2E-005)
  - [ ] Multiple shifts, support staff cap → 18 steps
- [ ] Run E2E tests on staging environment
- [ ] Achieve 100% pass rate on all critical flows

### Load Testing (Artillery/k6)
- [ ] Set up Artillery or k6
- [ ] Test: 100 concurrent users accessing dashboard
  - [ ] Measure response time (target: < 2 seconds)
  - [ ] Monitor error rate (target: < 1%)
- [ ] Test: Tip calculation with 50 employees
  - [ ] Measure calculation time (target: < 5 seconds)
  - [ ] Verify accuracy
- [ ] Test: Report generation under load
  - [ ] 10 concurrent CSV exports
  - [ ] Measure S3 upload time
- [ ] Identify bottlenecks and optimize
- [ ] Document performance benchmarks

### Security Testing
- [ ] Test tenant isolation:
  - [ ] Attempt to access other tenant's data via API
  - [ ] Verify 403 or 404 response
  - [ ] Test with modified JWT token
- [ ] Test input validation:
  - [ ] SQL injection attempts (e.g., email: "admin'--")
  - [ ] XSS attempts (e.g., name: "<script>alert('xss')</script>")
  - [ ] Verify inputs are sanitized/escaped
- [ ] Test authentication:
  - [ ] Attempt access without JWT token (401)
  - [ ] Attempt access with expired token (401)
  - [ ] Attempt access with tampered token (401)
- [ ] Test authorization:
  - [ ] Manager attempts to access admin endpoints (403)
  - [ ] Employee attempts to access manager endpoints (403)
- [ ] Test rate limiting:
  - [ ] Send 4 magic link requests in 1 hour (429 on 4th)
  - [ ] Send 11 requests from same IP (429 on 11th)
- [ ] Run OWASP ZAP security scanner
- [ ] Fix all identified vulnerabilities (P0 and P1)

### Code Quality & Coverage
- [ ] Run ESLint on all TypeScript files (fix errors)
- [ ] Run Prettier to format all code
- [ ] Check backend test coverage (target: 80%+)
  - [ ] Focus on tip calculation service (target: 90%+)
- [ ] Check frontend test coverage (target: 70%+)
- [ ] Add missing unit tests for uncovered code
- [ ] Review and refactor complex functions (cyclomatic complexity > 10)

### Bug Fixes & Polish
- [ ] Review all open bugs from testing (use BUG_LOG.md)
- [ ] Prioritize: P0 (critical) → P1 (high) → P2 (medium) → P3 (low)
- [ ] Fix all P0 bugs (system breaking, data corruption)
- [ ] Fix all P1 bugs (major features broken)
- [ ] Fix P2 bugs if time allows
- [ ] Document all bug fixes in BUG_LOG.md
- [ ] Create regression tests for fixed bugs
- [ ] Re-test fixed bugs

### UI/UX Improvements
- [ ] Review UI with pilot users
- [ ] Fix alignment and spacing issues
- [ ] Improve error messages (user-friendly, actionable)
- [ ] Add loading states to all async operations
- [ ] Add success/error notifications for all actions
- [ ] Improve mobile responsiveness (test on real devices)
- [ ] Add keyboard shortcuts for common actions (Ctrl+N for new entry, etc.)
- [ ] Improve accessibility (ARIA labels, keyboard navigation, screen reader support)

---

## Phase 15: Documentation & UAT Preparation (Week 18)

### API Documentation
- [ ] Set up Swagger/OpenAPI documentation
- [ ] Document all API endpoints with:
  - [ ] Method, path, description
  - [ ] Request parameters (path, query, body)
  - [ ] Request schema (Zod → JSON Schema)
  - [ ] Response schema (success and error)
  - [ ] Example requests and responses
  - [ ] Authentication requirements
  - [ ] Authorization requirements (roles)
- [ ] Host Swagger UI at /api/docs
- [ ] Test all API endpoints via Swagger UI

### User Guides
- [ ] Write Admin User Guide:
  - [ ] How to create tenants
  - [ ] How to manage users
  - [ ] How to configure shifts and support staff percentages
  - [ ] How to view audit logs
  - [ ] Screenshots for each feature
- [ ] Write Manager User Guide:
  - [ ] How to create daily tip entries
  - [ ] How to use the live preview
  - [ ] How to edit entries
  - [ ] How to view tip history
  - [ ] How to generate reports
  - [ ] How to export CSV
- [ ] Write Employee User Guide:
  - [ ] How to request magic link
  - [ ] How to view tip history
  - [ ] How to understand calculations
  - [ ] How to contact support

### Video Tutorials
- [ ] Record screen recordings for common tasks:
  - [ ] Admin: Creating a tenant and configuring shifts
  - [ ] Manager: Creating a daily tip entry
  - [ ] Manager: Generating a weekly report
  - [ ] Employee: Viewing tip history
- [ ] Upload videos to private YouTube/Vimeo
- [ ] Embed videos in user guides

### Deployment Documentation
- [ ] Write deployment runbook:
  - [ ] Prerequisites (AWS account, Terraform installed)
  - [ ] Step-by-step deployment instructions
  - [ ] Environment variable configuration
  - [ ] Database migration steps
  - [ ] Rollback procedures
  - [ ] Health check verification
- [ ] Write incident response playbook:
  - [ ] Common issues and solutions
  - [ ] Monitoring dashboard links
  - [ ] Escalation procedures
  - [ ] On-call rotation
  - [ ] Incident severity levels
- [ ] Create FAQ document:
  - [ ] Common user questions
  - [ ] Troubleshooting tips
  - [ ] Known limitations
  - [ ] Feature requests

---

## Phase 16: User Acceptance Testing (Week 19)

### UAT Environment Setup
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Create 3 test tenant accounts
- [ ] Create test users (Admin, Manager, Employee) for each tenant
- [ ] Seed test data (employees, shifts, sample tip entries)
- [ ] Verify all features work in staging

### UAT Participant Recruitment
- [ ] Recruit 3 pilot restaurants for UAT
  - [ ] Target: 1 small café, 1 medium restaurant, 1 large restaurant
- [ ] Schedule UAT sessions (1-2 hours per restaurant)
- [ ] Prepare UAT test scripts and scenarios
- [ ] Provide UAT credentials to participants

### UAT Training
- [ ] Conduct training sessions (1 hour each):
  - [ ] Demo all features
  - [ ] Walk through common workflows
  - [ ] Answer questions
  - [ ] Provide user guides
- [ ] Set up support channel (email or Slack)
- [ ] Encourage participants to report any issues

### UAT Execution
- [ ] Observe users performing tasks:
  - [ ] Manager: Create daily tip entry
  - [ ] Manager: Edit an entry
  - [ ] Manager: Generate weekly report
  - [ ] Employee: View tip history via magic link
  - [ ] Admin: Configure shifts and support staff percentages
- [ ] Take notes on usability issues
- [ ] Record bugs and feature requests
- [ ] Collect feedback via survey (Google Forms):
  - [ ] Ease of use (1-5 scale)
  - [ ] Feature completeness (1-5 scale)
  - [ ] Performance (1-5 scale)
  - [ ] Overall satisfaction (1-5 scale)
  - [ ] Open-ended feedback

### UAT Feedback Analysis
- [ ] Compile all feedback into issue tracker
- [ ] Categorize issues:
  - [ ] Critical (P0): Prevents core workflow
  - [ ] High (P1): Major usability issue
  - [ ] Medium (P2): Minor issue
  - [ ] Low (P3): Nice-to-have improvement
- [ ] Prioritize fixes (P0 and P1 must be fixed before production)
- [ ] Create action plan with timeline

### UAT Feedback Implementation
- [ ] Fix all P0 bugs
- [ ] Fix all P1 bugs
- [ ] Implement critical UX improvements
- [ ] Re-test fixed issues
- [ ] Conduct follow-up UAT session if major changes made
- [ ] Get final sign-off from all participants

---

## Phase 17: Production Deployment (Week 20)

### Pre-Deployment Checklist
- [ ] All P0 and P1 bugs fixed and tested
- [ ] UAT sign-off received from all participants
- [ ] All security tests passed (OWASP Top 10)
- [ ] Performance benchmarks met (calculation < 5s, pages < 2s)
- [ ] Code review completed
- [ ] Database migration scripts tested on staging
- [ ] Rollback plan documented and tested
- [ ] Monitoring dashboards configured
- [ ] Alerts configured and tested
- [ ] Backup and disaster recovery procedures documented

### Production Environment Setup
- [ ] Create production AWS account (separate from dev/staging)
- [ ] Deploy infrastructure via Terraform (production config)
- [ ] Create production RDS instance (Multi-AZ for high availability)
- [ ] Configure production S3 buckets
- [ ] Set up production CloudFront distribution
- [ ] Configure production Cognito User Pool
- [ ] Create production SES email sending domain
- [ ] Verify production DNS and SSL certificates
- [ ] Store all production secrets in AWS Secrets Manager

### Database Migration
- [ ] Create full backup of dev/staging database
- [ ] Run Prisma migrations on production database
  - [ ] `npx prisma migrate deploy`
- [ ] Verify schema in production
- [ ] Create initial production data:
  - [ ] Admin user account
  - [ ] Test tenant (for smoke testing)
  - [ ] Sample employees and shifts
- [ ] Test database connectivity from Lambda

### Application Deployment
- [ ] Deploy backend Lambda functions to production
  - [ ] Use CI/CD pipeline (GitHub Actions)
  - [ ] Tag release: v1.0.0
  - [ ] Deploy via SAM or Serverless Framework
- [ ] Deploy frontend to production S3
  - [ ] Build production bundle: `npm run build`
  - [ ] Upload to S3: `aws s3 sync dist/ s3://bucket-name/`
  - [ ] Invalidate CloudFront cache
- [ ] Update API Gateway stages (point to production Lambda)
- [ ] Test deployment with smoke tests

### Smoke Testing
- [ ] Test health check endpoint (GET /health)
- [ ] Test Admin login
- [ ] Test Manager login
- [ ] Test Employee magic link login
- [ ] Create a tip entry (end-to-end)
- [ ] View tip history
- [ ] Generate a report
- [ ] Export CSV
- [ ] Verify all critical features work

### Go-Live Announcement
- [ ] Send email to pilot customers with production URL
- [ ] Provide production credentials
- [ ] Include user guides and video tutorials
- [ ] Set up support email (support@your-domain.com)
- [ ] Monitor CloudWatch dashboards closely for first 48 hours

### Post-Deployment Monitoring (48 Hours)
- [ ] Monitor CloudWatch metrics every 2 hours:
  - [ ] Lambda error rate (should be < 1%)
  - [ ] API Gateway 5xx errors (should be 0)
  - [ ] RDS CPU utilization (should be < 50%)
  - [ ] Database connections (should be < 80% of max)
  - [ ] API response times (P95 < 3s, P99 < 5s)
- [ ] Watch for anomalies in CloudWatch Logs
- [ ] Check for user-reported issues via support email
- [ ] Fix any critical issues immediately
- [ ] Document all incidents in incident log

---

## Phase 18: Post-Launch Support & Optimization (Ongoing)

### Daily Monitoring (First Week)
- [ ] Review CloudWatch dashboards daily
- [ ] Check for Lambda cold starts and optimize if needed
- [ ] Monitor database query performance (slow query log)
- [ ] Review error logs and fix issues
- [ ] Respond to user support requests within 4 hours

### Weekly Monitoring (Ongoing)
- [ ] Review CloudWatch dashboards weekly
- [ ] Analyze AWS costs and optimize if needed
  - [ ] Check for unused resources
  - [ ] Consider Aurora Serverless v2 if usage is sporadic
  - [ ] Review Lambda memory allocation
- [ ] Review database indexes and add missing ones
- [ ] Apply security patches to dependencies (npm audit)
- [ ] Update documentation as needed

### User Support
- [ ] Set up support ticketing system (Zendesk, Freshdesk, or email)
- [ ] Respond to user questions within 24 hours
- [ ] Track common issues for future improvements
- [ ] Create knowledge base articles for FAQs
- [ ] Provide training to new restaurant locations

### Bug Fixes & Maintenance
- [ ] Triage incoming bug reports (use BUG_LOG.md)
- [ ] Fix critical bugs within 24 hours (hotfix deployment)
- [ ] Fix high-priority bugs within 1 week (patch release)
- [ ] Release patches as needed (v1.0.1, v1.0.2, etc.)
- [ ] Document all bug fixes in CHANGELOG.md

### Performance Optimization
- [ ] Optimize slow database queries (use EXPLAIN ANALYZE)
- [ ] Add missing database indexes
- [ ] Enable API Gateway caching for read endpoints (5-minute TTL)
- [ ] Implement Lambda provisioned concurrency for tip calculation (if cold starts are an issue)
- [ ] Optimize frontend bundle size (code splitting, lazy loading)
- [ ] Enable CloudFront caching with appropriate TTLs
- [ ] Consider RDS Proxy if database connections become an issue

### Cost Optimization
- [ ] Review monthly AWS bill
- [ ] Identify cost spikes and investigate
- [ ] Right-size RDS instance (scale up/down as needed)
- [ ] Consider Savings Plans for Lambda and RDS
- [ ] Enable S3 Intelligent-Tiering for backups
- [ ] Set up AWS Budgets with alerts ($50, $100, $150)

### Feature Enhancements (Phase 2 Planning)
- [ ] Gather user feedback on desired features:
  - [ ] Email notifications (daily summary to employees)
  - [ ] SMS notifications for magic links
  - [ ] Advanced reporting (custom date ranges, filters)
  - [ ] Mobile apps (iOS and Android)
  - [ ] POS system integration (automatic data import)
  - [ ] Payroll system integration (export to ADP, Gusto, etc.)
  - [ ] Multi-location management (chain restaurants)
  - [ ] Real-time tip tracking (tips added throughout the day)
- [ ] Prioritize Phase 2 features based on user demand
- [ ] Create detailed requirements for top 3-5 features
- [ ] Begin technical design for Phase 2
- [ ] Estimate effort and timeline for Phase 2

---

## Notes

**How to use this plan:**
1. When starting a task, mark it as in progress: `[ ]` → `[~]`
2. When completing a task, mark it as done: `[ ]` → `[x]`
3. Add notes below each task as needed
4. Update "Current Progress" weekly
5. Track blockers and dependencies

**Progress Tracking:**
- Total tasks: 500+
- Phases 4-6 core API: ~95% complete (remaining: employee pagination, config history pagination)
- Phase 5 tip calc: 100% complete
- Phase completed: Milestones 1-4 (local dev)
- Last updated: April 13, 2026

**Key Milestones:**
- [ ] Week 2: Infrastructure deployed, hello world live
- [ ] Week 4: Database schema complete, core APIs functional
- [ ] Week 7: Tip calculation service complete with tests
- [ ] Week 9: Magic link authentication working
- [ ] Week 12: Tip entry form with live preview complete
- [ ] Week 14: Reporting and CSV export complete
- [ ] Week 17: All E2E tests passing, security audit complete
- [ ] Week 19: UAT complete with sign-off
- [ ] Week 20: Production deployment successful
- [ ] Week 21+: Post-launch monitoring and support

**Critical Success Factors:**
1. Tip calculation accuracy (90%+ test coverage, verified manually)
2. Multi-tenant isolation (zero cross-tenant data leakage)
3. Performance (calculation < 5s, pages < 2s)
4. Security (OWASP Top 10 compliance, rate limiting)
5. User satisfaction (UAT score > 4.0/5.0)

**Risks & Mitigation:**
- **Risk**: Tip calculation algorithm complexity → **Mitigation**: Extensive unit tests, manual verification
- **Risk**: Multi-tenant security breach → **Mitigation**: Security tests, penetration testing, code review
- **Risk**: Performance issues with 50 employees → **Mitigation**: Load testing, optimization, caching
- **Risk**: UAT delays or negative feedback → **Mitigation**: Early prototype testing, iterative feedback
- **Risk**: AWS cost overruns → **Mitigation**: Cost monitoring, budgets, right-sizing resources

---

**Document Status:** In progress
**Next Action:** Minor gaps (employee list pagination, config history pagination) or begin Phase 1 infrastructure
