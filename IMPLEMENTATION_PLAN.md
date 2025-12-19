# Tip Pooling System - Implementation Plan

**Created:** 2025-12-19
**Status:** Not Started

This plan tracks all implementation steps for the tip pooling management system. Update this file as you complete each step.

---

## Phase 1: Foundation (Weeks 1-2)

### AWS Account & Infrastructure Setup
- [ ] Create AWS account and configure billing alerts
- [ ] Set up IAM users and roles with least privilege access
- [ ] Configure AWS CLI and credentials locally
- [ ] Create S3 buckets for deployments and backups

### Network Infrastructure
- [ ] Create VPC with public and private subnets
- [ ] Set up Internet Gateway and NAT Gateway
- [ ] Configure security groups and network ACLs
- [ ] Create VPC endpoints for Lambda-RDS connectivity

### Database Setup
- [ ] Create Amazon RDS PostgreSQL instance (Multi-AZ for prod, single-AZ for dev)
- [ ] Configure database security groups (private subnet access only)
- [ ] Set up automated backups (6-hour intervals)
- [ ] Enable point-in-time recovery
- [ ] Store database credentials in AWS Secrets Manager

### Infrastructure as Code
- [ ] Initialize Terraform project structure
- [ ] Create modules for: network, rds, lambda, api-gateway, cognito, s3, cloudfront
- [ ] Write Terraform configuration for dev environment
- [ ] Write Terraform configuration for staging environment
- [ ] Write Terraform configuration for production environment
- [ ] Test infrastructure deployment to dev

### Authentication Service
- [ ] Create AWS Cognito User Pool
- [ ] Configure user pool for Admin/Manager authentication
- [ ] Set up password policies (12+ chars, complexity requirements)
- [ ] Configure session timeout (30 min for Admin/Manager, 15 min for Employee)
- [ ] Create Cognito app clients

### CI/CD Pipeline
- [ ] Create GitHub repository (or GitLab)
- [ ] Set up branch protection rules (main, staging, develop)
- [ ] Configure GitHub Actions (or AWS CodePipeline)
- [ ] Create CI workflow: lint, type-check, test
- [ ] Create CD workflow: build, deploy to dev/staging/prod
- [ ] Set up automated deployment triggers

### Monitoring & Logging
- [ ] Configure CloudWatch log groups for Lambda functions
- [ ] Create CloudWatch dashboard for key metrics
- [ ] Set up CloudWatch alarms (Lambda errors, RDS CPU, API Gateway 5xx)
- [ ] Configure SNS topics for alert notifications
- [ ] Enable AWS X-Ray for distributed tracing

### Hello World Deployment
- [ ] Create "Hello World" Lambda function
- [ ] Deploy Lambda via API Gateway
- [ ] Test API endpoint returns 200 OK
- [ ] Deploy static React "Hello World" to S3
- [ ] Configure CloudFront distribution for frontend
- [ ] Test frontend loads successfully
- [ ] (Optional) Configure custom domain with Route 53

---

## Phase 2: Core Backend (Weeks 3-4)

### Project Setup
- [ ] Initialize Node.js/TypeScript backend project
- [ ] Configure tsconfig.json with strict mode
- [ ] Set up ESLint and Prettier
- [ ] Install dependencies: express, prisma, zod, jest, supertest
- [ ] Create project folder structure: src/routes, src/services, src/middleware, src/types

### Database Schema & Migrations
- [ ] Initialize Prisma project
- [ ] Define Prisma schema for all tables (tenants, users, employees, shifts, etc.)
- [ ] Create initial migration
- [ ] Run migration against dev database
- [ ] Seed dev database with test data
- [ ] Open Prisma Studio and verify schema

### Authentication & Authorization Middleware
- [ ] Create JWT validation middleware (verify Cognito tokens)
- [ ] Create role-based authorization middleware (Admin, Manager, Employee)
- [ ] Create tenant isolation middleware (enforce tenant_id scoping)
- [ ] Write unit tests for all middleware
- [ ] Test middleware with mock requests

### Tenant Management API
- [ ] POST /api/v1/tenants - Create tenant
- [ ] GET /api/v1/tenants - List all tenants (admin only)
- [ ] GET /api/v1/tenants/:id - Get tenant details
- [ ] PATCH /api/v1/tenants/:id - Update tenant
- [ ] DELETE /api/v1/tenants/:id - Delete tenant
- [ ] Create Zod validation schemas for tenant requests
- [ ] Write integration tests for all tenant endpoints
- [ ] Test tenant isolation (cannot access other tenant data)

### User Management API
- [ ] POST /api/v1/users - Create user (Admin/Manager)
- [ ] GET /api/v1/users - List users (filtered by tenant)
- [ ] GET /api/v1/users/:id - Get user details
- [ ] PATCH /api/v1/users/:id - Update user
- [ ] DELETE /api/v1/users/:id - Deactivate user
- [ ] Create Zod validation schemas
- [ ] Write integration tests
- [ ] Test role-based access control

### Employee Management API
- [ ] POST /api/v1/employees - Create employee
- [ ] GET /api/v1/employees - List employees (active/inactive filter)
- [ ] GET /api/v1/employees/:id - Get employee details
- [ ] PATCH /api/v1/employees/:id - Update employee
- [ ] DELETE /api/v1/employees/:id - Soft delete employee
- [ ] GET /api/v1/employees/:id/rate-history - Get rate history
- [ ] POST /api/v1/employees/:id/update-rate - Update hourly rate (creates history)
- [ ] Create Zod validation schemas
- [ ] Write integration tests
- [ ] Test soft delete functionality

### Shift Configuration API
- [ ] POST /api/v1/shifts - Create shift
- [ ] GET /api/v1/shifts - List shifts (active only)
- [ ] GET /api/v1/shifts/:id - Get shift details
- [ ] PATCH /api/v1/shifts/:id - Update shift name
- [ ] DELETE /api/v1/shifts/:id - Soft delete shift
- [ ] Create Zod validation schemas
- [ ] Write integration tests
- [ ] Test max 10 shifts per tenant validation

### Support Staff Configuration API
- [ ] GET /api/v1/config/support-staff - Get current config
- [ ] POST /api/v1/config/support-staff - Update config (creates history with effective_date)
- [ ] GET /api/v1/config/support-staff/history - Get config history
- [ ] Create Zod validation schemas (0-50% range)
- [ ] Write integration tests
- [ ] Test effective_date logic

---

## Phase 3: Tip Calculation Logic (Week 5)

### Tip Calculation Service
- [ ] Create TipCalculationService class
- [ ] Implement server tip proration algorithm
- [ ] Implement support staff tip calculation with shift matching
- [ ] Implement support staff cap enforcement (≤ highest server)
- [ ] Calculate hourly pay, total pay, effective hourly rate
- [ ] Handle edge cases: no servers, no support staff, single shift, multiple shifts

### Tip Calculation Unit Tests
- [ ] Test server proration with equal hours
- [ ] Test server proration with unequal hours
- [ ] Test support staff receiving tips from shared shift servers only
- [ ] Test support staff cap enforcement
- [ ] Test employee working multiple shifts
- [ ] Test single employee scenarios
- [ ] Test 50 employee scenario (performance)
- [ ] Verify calculations match PRD examples
- [ ] Achieve 90%+ code coverage for calculation logic

### Tip Entry API
- [ ] POST /api/v1/tips/entries - Create daily tip entry
- [ ] GET /api/v1/tips/entries - List all entries (paginated, date filter)
- [ ] GET /api/v1/tips/entries/:id - Get entry with calculations
- [ ] PATCH /api/v1/tips/entries/:id - Edit entry (creates new, soft deletes old)
- [ ] DELETE /api/v1/tips/entries/:id - Soft delete entry
- [ ] GET /api/v1/tips/entries/:id/calculations - Get detailed breakdown
- [ ] POST /api/v1/tips/calculate - Preview calculation (doesn't save)
- [ ] Create Zod validation schemas
- [ ] Write integration tests
- [ ] Test unique constraint (one active entry per tenant per date)

### Audit Trail Implementation
- [ ] Create AuditService class
- [ ] Log all CREATE operations to audit_logs
- [ ] Log all UPDATE operations with old/new values (JSONB)
- [ ] Log all DELETE operations
- [ ] Capture IP address and user agent
- [ ] Test audit log immutability (cannot modify/delete)
- [ ] Test audit retrieval for tip entry edit history

---

## Phase 4: Frontend - Authentication & Layout (Week 6)

### React Project Setup
- [ ] Initialize React app with TypeScript
- [ ] Install dependencies: MUI, React Router, React Hook Form, Zod, React Query, Axios
- [ ] Configure ESLint and Prettier
- [ ] Set up folder structure: components, pages, hooks, services, types
- [ ] Configure environment variables (.env files)

### Authentication UI
- [ ] Create Login page (email + password)
- [ ] Create AuthContext for managing auth state
- [ ] Integrate with AWS Cognito (sign in)
- [ ] Store JWT tokens in httpOnly cookies (or secure localStorage)
- [ ] Implement token refresh logic
- [ ] Create ProtectedRoute component
- [ ] Test login flow (Admin/Manager)

### Navigation & Layout
- [ ] Create AppLayout component with sidebar/header
- [ ] Create Navigation component with role-based menu items
- [ ] Implement logout functionality
- [ ] Create dashboard shells for Admin, Manager, Employee
- [ ] Implement responsive design (mobile, tablet, desktop)
- [ ] Test navigation between pages

### Role-Based Routing
- [ ] Define routes for Admin: /tenants, /users, /employees, /shifts, /config, /tips, /reports, /audit
- [ ] Define routes for Manager: /employees, /tips, /reports
- [ ] Define routes for Employee: /my-tips
- [ ] Implement route guards based on user role
- [ ] Test access control (Manager cannot access /audit, etc.)

---

## Phase 5: Frontend - Admin Features (Week 7)

### Employee Management UI
- [ ] Create EmployeeList page with table (name, email, role, hourly rate, status)
- [ ] Create EmployeeForm dialog (add/edit employee)
- [ ] Implement form validation with Zod
- [ ] Implement search and filter (active/inactive)
- [ ] Implement soft delete with confirmation
- [ ] Show rate history dialog
- [ ] Test CRUD operations

### Shift Configuration UI
- [ ] Create ShiftList page with table
- [ ] Create ShiftForm dialog (add/edit shift)
- [ ] Implement validation (max 10 shifts)
- [ ] Implement soft delete with confirmation
- [ ] Test CRUD operations

### Support Staff Configuration UI
- [ ] Create SupportStaffConfig page
- [ ] Display current Busser % and Expeditor %
- [ ] Create form to update percentages with effective date
- [ ] Show configuration history table
- [ ] Implement validation (0-50% range)
- [ ] Test configuration updates

### User Management UI (Admin only)
- [ ] Create UserList page
- [ ] Create UserForm dialog (create Admin/Manager accounts)
- [ ] Implement role assignment
- [ ] Test user creation and permissions

### Error Handling & Loading States
- [ ] Create ErrorBoundary component
- [ ] Create LoadingSpinner component
- [ ] Display error messages from API
- [ ] Show loading states during API calls

---

## Phase 6: Frontend - Tip Entry (Week 8)

### Tip Entry Form
- [ ] Create TipEntryForm page
- [ ] Date picker for entry date
- [ ] Input fields: starting drawer, closing drawer, electronic tips
- [ ] Display calculated cash tips (closing - starting)
- [ ] Display calculated total tips (cash + electronic)
- [ ] Dynamic employee selection (multi-select)
- [ ] For each employee: role dropdown, shift multi-select, hours input
- [ ] Validate: at least one server, hours between 0.5-16
- [ ] Implement "Add Employee" and "Remove Employee" buttons

### Calculation Preview
- [ ] Create "Preview Calculation" button
- [ ] Call POST /api/v1/tips/calculate (doesn't save)
- [ ] Display results in expandable table
- [ ] Show: employee name, role, shifts, hours, hourly pay, tips, total pay, effective rate
- [ ] Highlight support staff cap if applied
- [ ] Show summary: total tips distributed, total hours, employee count

### Tip Entry Submission
- [ ] Create "Confirm and Save" button
- [ ] Call POST /api/v1/tips/entries
- [ ] Show success message
- [ ] Redirect to tip entry list or view details
- [ ] Handle errors (duplicate entry, validation errors)

### Mobile Responsive Design
- [ ] Test form on mobile devices
- [ ] Ensure tables scroll horizontally on small screens
- [ ] Test touch interactions

---

## Phase 7: Data Management & History (Week 9)

### Tip Entry List & History
- [ ] Create TipEntryList page with table
- [ ] Display: date, manager, total tips, employee count, status
- [ ] Implement date range filter
- [ ] Implement employee name search
- [ ] Implement pagination (50 entries per page)
- [ ] Click entry to view details

### Tip Entry Detail View
- [ ] Create TipEntryDetail page
- [ ] Display entry summary (date, drawer balances, tips)
- [ ] Display calculation breakdown table
- [ ] Show manager who created entry and timestamp
- [ ] Add "Edit" button (if user is Manager/Admin)

### Tip Entry Edit
- [ ] Pre-populate form with existing entry data
- [ ] Allow modification of all fields
- [ ] Show "This will create a new version" warning
- [ ] On save: call PATCH /api/v1/tips/entries/:id
- [ ] Display success message
- [ ] Show updated entry details

### Audit Log Viewer (Admin only)
- [ ] Create AuditLogList page
- [ ] Display: timestamp, user, action, entity type, entity ID
- [ ] Click to view old/new values (JSONB diff)
- [ ] Filter by entity type, date range
- [ ] Implement pagination
- [ ] Test audit trail for edited entries

---

## Phase 8: Employee Self-Service (Week 10)

### Magic Link Authentication (Backend)
- [ ] POST /api/v1/auth/magic-link - Generate token and send email
- [ ] Generate unique token (UUID) with 15-minute expiry
- [ ] Store token in database (or DynamoDB) with expiration timestamp
- [ ] Integrate with Amazon SES to send email
- [ ] Create email template with magic link
- [ ] GET /api/v1/auth/verify-magic-link?token=xxx - Validate token
- [ ] Mark token as used after successful validation
- [ ] Create temporary Cognito session for employee
- [ ] Return JWT token

### Magic Link Authentication (Frontend)
- [ ] Create EmployeeLogin page (email input only)
- [ ] On submit, call POST /api/v1/auth/magic-link
- [ ] Show "Check your email" message
- [ ] Create MagicLinkVerify page (handles redirect from email)
- [ ] Parse token from URL query params
- [ ] Call GET /api/v1/auth/verify-magic-link
- [ ] Store JWT and redirect to employee dashboard

### Employee Dashboard
- [ ] Create EmployeeDashboard page
- [ ] GET /api/v1/employee/my-tips (past 30 days)
- [ ] Display tip history table: date, shifts, hours, tips, hourly pay, total pay, effective rate
- [ ] Implement date range filter (within 30-day window)
- [ ] Display monthly summary: total tips, total hours, average effective rate
- [ ] Test session timeout (15 minutes)

### Mobile Optimization
- [ ] Optimize employee dashboard for mobile
- [ ] Test email link clicks on mobile devices
- [ ] Ensure tables are readable on small screens

---

## Phase 9: Reporting & Exports (Week 11)

### Report APIs (Backend)
- [ ] GET /api/v1/reports/daily/:date - Daily summary report
- [ ] GET /api/v1/reports/weekly/:start-date - Weekly summary report
- [ ] GET /api/v1/reports/monthly/:year/:month - Monthly summary report
- [ ] POST /api/v1/reports/export - Generate CSV export
- [ ] Implement CSV generation (date range, all employee details)
- [ ] Upload CSV to S3 and return download URL
- [ ] Implement 1-year max date range validation
- [ ] Test with large datasets (performance)

### Report UI
- [ ] Create ReportDashboard page
- [ ] Daily report: total tips, total hours, employee count
- [ ] Weekly report: aggregated metrics for 7 days
- [ ] Monthly report: aggregated metrics for month
- [ ] Display charts using Recharts (tips over time, hours distribution)
- [ ] Test chart rendering and data accuracy

### CSV Export UI
- [ ] Create ExportDialog component
- [ ] Date range picker (start/end dates)
- [ ] "Generate Export" button
- [ ] Show loading indicator during generation
- [ ] Download CSV file when ready
- [ ] Test export with 1 year of data

### Data Visualization
- [ ] Create line chart for tips over time
- [ ] Create bar chart for hours distribution by employee
- [ ] Create pie chart for tip distribution by role
- [ ] Test chart responsiveness

---

## Phase 10: Testing & Polish (Week 12)

### End-to-End Tests
- [ ] Set up Playwright or Cypress
- [ ] E2E Test: Manager login → Create tip entry → View results
- [ ] E2E Test: Employee login via magic link → View 30-day tips
- [ ] E2E Test: Admin configure shift → Manager uses new shift in entry
- [ ] E2E Test: Manager edit tip entry → Verify audit trail
- [ ] E2E Test: Export CSV → Verify file contents
- [ ] Run E2E tests on staging environment

### Load Testing
- [ ] Set up Artillery or k6
- [ ] Test: 100 concurrent users accessing dashboard
- [ ] Test: Tip calculation with 50 employees
- [ ] Test: Report generation under load
- [ ] Measure response times (target: calculation < 5s, pages < 2s)
- [ ] Identify and fix bottlenecks

### Bug Fixes
- [ ] Review all open bugs from testing
- [ ] Prioritize and fix critical bugs
- [ ] Re-test fixed bugs
- [ ] Update tests to prevent regressions

### Security Audit
- [ ] Review all authentication/authorization logic
- [ ] Test tenant isolation (attempt cross-tenant access)
- [ ] Test input validation (SQL injection, XSS attempts)
- [ ] Review secrets management (no hardcoded credentials)
- [ ] Test rate limiting and CORS configuration
- [ ] Run OWASP ZAP or similar security scanner
- [ ] Fix identified vulnerabilities

### Performance Optimization
- [ ] Optimize database queries (check query plans)
- [ ] Add missing database indexes
- [ ] Enable API Gateway caching for read endpoints
- [ ] Implement Lambda provisioned concurrency for tip calculation
- [ ] Optimize frontend bundle size (code splitting)
- [ ] Enable CloudFront caching with appropriate TTLs
- [ ] Test performance after optimizations

### UI/UX Polish
- [ ] Review UI with feedback from pilot users
- [ ] Fix alignment and spacing issues
- [ ] Improve error messages (make them user-friendly)
- [ ] Add loading states to all async operations
- [ ] Add success notifications for all actions
- [ ] Improve mobile responsiveness
- [ ] Add keyboard shortcuts for common actions

### Documentation
- [ ] Write API documentation (Swagger/OpenAPI)
- [ ] Write Admin user guide
- [ ] Write Manager user guide
- [ ] Write Employee user guide
- [ ] Create video tutorials (screen recordings)
- [ ] Write deployment runbook
- [ ] Write incident response playbook
- [ ] Create FAQ document

---

## Phase 11: UAT & Production Deploy (Week 13)

### Staging Deployment
- [ ] Deploy to staging environment
- [ ] Verify all features work in staging
- [ ] Run smoke tests
- [ ] Monitor CloudWatch metrics for errors

### User Acceptance Testing
- [ ] Recruit 3 pilot restaurants for UAT
- [ ] Provide training to pilot users
- [ ] Observe users performing common tasks
- [ ] Collect feedback on usability, bugs, missing features
- [ ] Document all feedback in issue tracker

### UAT Feedback Implementation
- [ ] Prioritize UAT feedback (critical vs nice-to-have)
- [ ] Implement critical fixes and improvements
- [ ] Re-test after changes
- [ ] Get final sign-off from pilot users

### Final Security Review
- [ ] Review all security measures one final time
- [ ] Verify encryption (TLS in transit, AES-256 at rest)
- [ ] Verify access controls and RBAC
- [ ] Verify audit logging is working
- [ ] Conduct penetration testing (if budget allows)

### Production Deployment
- [ ] Create production database backup before deploy
- [ ] Deploy backend to production Lambda functions
- [ ] Deploy frontend to production S3/CloudFront
- [ ] Run database migrations on production
- [ ] Verify DNS and SSL certificates
- [ ] Run smoke tests on production

### Post-Deploy Monitoring
- [ ] Monitor CloudWatch metrics for 48 hours
- [ ] Watch for errors, high latency, or anomalies
- [ ] Monitor database performance
- [ ] Check error logs and fix issues immediately
- [ ] Verify automated backups are running

### Incident Response Plan
- [ ] Document on-call rotation
- [ ] Create runbooks for common issues
- [ ] Set up PagerDuty or similar alerting
- [ ] Test rollback procedure
- [ ] Document escalation procedures

---

## Phase 12: Post-Launch Support (Ongoing)

### Monitoring & Maintenance
- [ ] Review CloudWatch dashboards daily (first week)
- [ ] Review CloudWatch dashboards weekly (ongoing)
- [ ] Monitor AWS costs and optimize
- [ ] Apply security patches to dependencies
- [ ] Update documentation as needed

### User Support
- [ ] Set up support email or ticketing system
- [ ] Respond to user questions and issues
- [ ] Track common issues for future improvements
- [ ] Provide training to new restaurant locations

### Bug Fixes
- [ ] Triage incoming bug reports
- [ ] Fix critical bugs within 24 hours
- [ ] Fix high-priority bugs within 1 week
- [ ] Release patches as needed

### Phase 2 Planning
- [ ] Gather user feedback on desired features
- [ ] Prioritize Phase 2 features (email notifications, advanced reporting, mobile app)
- [ ] Create detailed requirements for Phase 2
- [ ] Begin technical design for Phase 2

---

## Notes

**How to use this plan:**
1. When starting a task, mark it as in progress by changing `[ ]` to `[~]`
2. When completing a task, mark it as done by changing `[ ]` to `[x]`
3. Add notes below each task as needed
4. Update this file regularly to track overall progress

**Current Progress:** 0% (0 of 300+ tasks completed)

**Last Updated:** 2025-12-19
