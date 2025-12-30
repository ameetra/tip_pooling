# Test Plan & Test Scenarios
## Tip Pooling Management System

**Document Version:** 1.0
**Last Updated:** December 29, 2025
**Test Lead:** [To be filled]
**Status:** Draft

---

## Table of Contents
1. [Test Strategy Overview](#1-test-strategy-overview)
2. [Test Levels](#2-test-levels)
3. [Unit Test Scenarios](#3-unit-test-scenarios)
4. [Integration Test Scenarios](#4-integration-test-scenarios)
5. [End-to-End Test Scenarios](#5-end-to-end-test-scenarios)
6. [Security Test Scenarios](#6-security-test-scenarios)
7. [Performance Test Scenarios](#7-performance-test-scenarios)
8. [Test Data Requirements](#8-test-data-requirements)
9. [Test Environment Setup](#9-test-environment-setup)
10. [Entry & Exit Criteria](#10-entry--exit-criteria)
11. [Test Execution Schedule](#11-test-execution-schedule)
12. [Defect Management](#12-defect-management)
13. [Risk Assessment](#13-risk-assessment)
14. [Approval & Sign-off](#14-approval--sign-off)

---

## 1. Test Strategy Overview

### 1.1 Testing Objectives
- Verify accuracy of tip calculation algorithm (100% correctness required)
- Ensure multi-tenant data isolation and security
- Validate system performance meets requirements (< 5 second calculations)
- Confirm compliance with FLSA regulations for tip pooling
- Ensure data integrity and audit trail completeness

### 1.2 Testing Approach
- **Test-Driven Development (TDD):** Write tests before implementation
- **Automated Testing:** 80% of tests automated (unit + integration)
- **Manual Testing:** Critical user flows, exploratory testing
- **Continuous Testing:** Tests run on every commit via CI/CD
- **Risk-Based Testing:** Focus on high-risk areas (calculations, security, multi-tenancy)

### 1.3 Test Coverage Targets
- **Unit Tests:** 80% code coverage (backend), 70% (frontend)
- **Integration Tests:** All API endpoints, database operations
- **E2E Tests:** All critical user workflows (3-5 flows minimum)
- **Security Tests:** OWASP Top 10 vulnerabilities
- **Performance Tests:** 100 concurrent users, 50 employees per entry

### 1.4 Testing Tools
- **Unit Testing:** Jest, React Testing Library
- **Integration Testing:** Supertest, Playwright
- **E2E Testing:** Playwright or Cypress
- **Load Testing:** Artillery or k6
- **API Testing:** Postman, Swagger
- **Code Coverage:** Istanbul/NYC
- **CI/CD:** GitHub Actions or AWS CodePipeline

---

## 2. Test Levels

### 2.1 Test Pyramid

```
           /\
          /E2E\         10% - End-to-End Tests
         /------\
        /  API   \      30% - Integration/API Tests
       /----------\
      /    UNIT    \    60% - Unit Tests
     /--------------\
```

### 2.2 Test Level Breakdown

| Test Level | Purpose | Tools | Coverage Target |
|------------|---------|-------|-----------------|
| Unit | Test individual functions/components | Jest | 80% backend, 70% frontend |
| Integration | Test API endpoints + database | Supertest, Playwright | All endpoints |
| E2E | Test complete user workflows | Playwright/Cypress | Critical flows |
| Security | Test vulnerabilities, auth, authorization | OWASP ZAP, manual | All security features |
| Performance | Test scalability, response times | Artillery, k6 | Load scenarios |
| UAT | User acceptance testing | Manual | All features |

---

## 3. Unit Test Scenarios

### 3.1 Backend Unit Tests (Node.js/TypeScript)

#### 3.1.1 Tip Calculation Algorithm Tests

**Test Suite: `TipCalculationService`**

| Test ID | Test Case | Input | Expected Output | Priority |
|---------|-----------|-------|-----------------|----------|
| TC-CALC-001 | Single server receives 100% of tips | 1 server, 8 hrs, $1000 tips | Server gets $1000 | P0 |
| TC-CALC-002 | Two servers equal hours split 50/50 | 2 servers, 8 hrs each, $1000 tips | Each gets $500.00 | P0 |
| TC-CALC-003 | Two servers unequal hours (2:1 ratio) | Server A: 8 hrs, Server B: 4 hrs, $900 tips | A: $600.00, B: $300.00 | P0 |
| TC-CALC-004 | Server works multiple shifts | Server A: 2 shifts (8 hrs), Server B: 1 shift (8 hrs), $1000 tips | Each gets $500.00 | P0 |
| TC-CALC-005 | Busser receives percentage from servers | 1 busser, 2 servers same shift, 20% config, $1000 total | Busser gets percentage of server tips | P0 |
| TC-CALC-006 | Support staff cap applied | Busser tips exceed highest server | Busser tips capped to highest server amount | P0 |
| TC-CALC-007 | Support staff cap not needed | Busser tips below highest server | Busser gets full calculated amount | P1 |
| TC-CALC-008 | Multiple support staff on same shift | 1 busser, 1 expeditor, 2 servers | Each support staff calculates independently | P1 |
| TC-CALC-009 | Rounding: $10 split 3 ways | 3 servers equal hours, $10 tips | $3.33, $3.33, $3.34 (highest earner) | P0 |
| TC-CALC-010 | Total distributed equals tip pool | Any scenario | Sum of all tips = total tip pool (±$0.01) | P0 |
| TC-CALC-011 | Zero servers throws error | Empty server array | Error: "At least one server is required" | P0 |
| TC-CALC-012 | Zero hours throws error | Server with 0 hours | Error: "Total server hours must be greater than zero" | P0 |
| TC-CALC-013 | Negative tip pool throws error | Total tips < 0 | Error: "Total tip pool cannot be negative" | P0 |
| TC-CALC-014 | Negative drawer balance | Closing < starting drawer | Validation error | P1 |
| TC-CALC-015 | Employee works > 16 hours | Hours = 17 | Validation error | P2 |
| TC-CALC-016 | Same employee listed twice | Duplicate employee in list | Validation error | P1 |
| TC-CALC-017 | Support staff with no shared shifts | Busser and server work different shifts | Busser receives $0 from that server | P1 |
| TC-CALC-018 | Three-way split with support staff | 2 servers, 1 busser, complex scenario | Accurate calculation per algorithm | P0 |
| TC-CALC-019 | Decimal hours (4.5, 7.25) | Servers work decimal hours | Accurate proration | P1 |
| TC-CALC-020 | Large tip amount (precision test) | $10,000+ tip pool | Maintains precision, no overflow | P2 |

**Implementation Example:**

```typescript
// tests/services/tip-calculation.test.ts
describe('TipCalculationService', () => {
  describe('calculateTips', () => {
    test('TC-CALC-001: Single server receives 100% of tips', () => {
      const employees = [
        { id: '1', roleOnDay: 'SERVER', shifts: ['lunch'], hoursWorked: 8, hourlyRate: 15 }
      ];
      const result = calculateTips(1000, employees, []);

      expect(result[0].finalTips).toBe(1000.00);
      expect(result[0].totalPay).toBe(1120.00); // 8 * 15 + 1000
    });

    test('TC-CALC-002: Two servers equal hours split 50/50', () => {
      const employees = [
        { id: '1', roleOnDay: 'SERVER', shifts: ['lunch'], hoursWorked: 8, hourlyRate: 15 },
        { id: '2', roleOnDay: 'SERVER', shifts: ['dinner'], hoursWorked: 8, hourlyRate: 15 }
      ];
      const result = calculateTips(1000, employees, []);

      expect(result[0].finalTips).toBe(500.00);
      expect(result[1].finalTips).toBe(500.00);
    });

    test('TC-CALC-011: Zero servers throws error', () => {
      expect(() => calculateTips(1000, [], [])).toThrow('At least one server is required');
    });
  });
});
```

#### 3.1.2 Employee Management Tests

**Test Suite: `EmployeeService`**

| Test ID | Test Case | Input | Expected Output | Priority |
|---------|-----------|-------|-----------------|----------|
| TC-EMP-001 | Create employee successfully | Valid employee data | Employee created, returns ID | P0 |
| TC-EMP-002 | Create employee with duplicate email | Email already exists in tenant | Error: "Email already exists" | P0 |
| TC-EMP-003 | Update employee hourly rate | New rate + effective date | New rate history record created | P0 |
| TC-EMP-004 | Soft delete employee | Valid employee ID | is_active = false, deleted_at set | P0 |
| TC-EMP-005 | Reactivate employee | Deleted employee ID | is_active = true, deleted_at = null | P1 |
| TC-EMP-006 | Get employee rate for date | Employee ID + date | Correct rate for that date | P0 |
| TC-EMP-007 | Validate employee role enum | Invalid role | Validation error | P1 |
| TC-EMP-008 | Create employee with negative rate | Hourly rate < 0 | Validation error | P1 |

#### 3.1.3 Tip Entry Management Tests

**Test Suite: `TipEntryService`**

| Test ID | Test Case | Input | Expected Output | Priority |
|---------|-----------|-------|-----------------|----------|
| TC-ENTRY-001 | Create tip entry successfully | Valid tip entry data | Entry created, calculations saved | P0 |
| TC-ENTRY-002 | Prevent duplicate entry for date | Entry already exists for date | Error or warning | P0 |
| TC-ENTRY-003 | Edit tip entry (creates new record) | Modified entry data | New record created, old soft deleted | P0 |
| TC-ENTRY-004 | Audit trail created on edit | Edit operation | Audit log with old/new values | P0 |
| TC-ENTRY-005 | Soft delete tip entry | Valid entry ID | is_deleted = true, calculations preserved | P0 |
| TC-ENTRY-006 | Get tip entry with calculations | Entry ID | Entry + all employee calculations | P0 |
| TC-ENTRY-007 | Validate drawer balance | Closing < (starting + cash sales) | Validation error | P1 |
| TC-ENTRY-008 | Calculate cash tips with cash sales | Starting $500, closing $1800, cash sales $1000 | Cash tips = $300 | P0 |
| TC-ENTRY-009 | Calculate cash tips without cash sales | Starting $500, closing $800, cash sales $0 | Cash tips = $300 | P0 |
| TC-ENTRY-010 | Negative cash sales rejected | Cash sales = -$100 | Validation error | P1 |
| TC-ENTRY-011 | Cash sales exceeds drawer balance | Starting $500, closing $600, cash sales $200 | Validation error (closing must be >= starting + sales) | P1 |

#### 3.1.4 Multi-Tenant Isolation Tests

**Test Suite: `TenantMiddleware`**

| Test ID | Test Case | Input | Expected Output | Priority |
|---------|-----------|-------|-----------------|----------|
| TC-TENANT-001 | User can only access own tenant data | User from Tenant A requests Tenant B data | 403 Forbidden | P0 |
| TC-TENANT-002 | Queries automatically scoped by tenant | Get employees (no tenant in query) | Only current user's tenant employees | P0 |
| TC-TENANT-003 | Cannot create data for other tenant | Tip entry with different tenant_id | Error or ignored, uses JWT tenant_id | P0 |
| TC-TENANT-004 | Admin with multiple tenants | Admin switches tenant context | Can access both tenants | P1 |

#### 3.1.5 Authentication & Authorization Tests

**Test Suite: `AuthService`**

| Test ID | Test Case | Input | Expected Output | Priority |
|---------|-----------|-------|-----------------|----------|
| TC-AUTH-001 | Admin login with valid credentials | Valid email + password | JWT token with role=ADMIN | P0 |
| TC-AUTH-002 | Login with invalid credentials | Wrong password | 401 Unauthorized | P0 |
| TC-AUTH-003 | Manager cannot access admin endpoints | Manager JWT token | 403 Forbidden | P0 |
| TC-AUTH-004 | Employee cannot access manager endpoints | Employee JWT token | 403 Forbidden | P0 |
| TC-AUTH-005 | JWT token expires after timeout | Token older than 30 min | 401 Unauthorized | P1 |
| TC-AUTH-006 | Refresh token successfully | Valid refresh token | New JWT token | P1 |

#### 3.1.6 Magic Link Tests

**Test Suite: `MagicLinkService`**

| Test ID | Test Case | Input | Expected Output | Priority |
|---------|-----------|-------|-----------------|----------|
| TC-MAGIC-001 | Generate magic link for employee | Valid employee email | Token created, email sent | P0 |
| TC-MAGIC-002 | Magic link expires after 15 min | Token created 16 min ago | Error: "Link expired" | P0 |
| TC-MAGIC-003 | Magic link is single-use | Token already used | Error: "Link already used" | P0 |
| TC-MAGIC-004 | Rate limit: 3 per email per hour | 4th request within 1 hour | Error: "Rate limit exceeded" | P0 |
| TC-MAGIC-005 | Rate limit: 10 per IP per hour | 11th request from same IP | Error: "Too many requests" | P0 |
| TC-MAGIC-006 | Invalid email address | Email not in employee database | Error: "Employee not found" | P1 |
| TC-MAGIC-007 | Verify magic link successfully | Valid, unused, non-expired token | Session created, JWT returned | P0 |

### 3.2 Frontend Unit Tests (React/TypeScript)

#### 3.2.1 Form Validation Tests

**Test Suite: `TipEntryForm`**

| Test ID | Test Case | Input | Expected Output | Priority |
|---------|-----------|-------|-----------------|----------|
| TC-FORM-001 | Starting drawer accepts valid amount | $500.00 | No validation error | P0 |
| TC-FORM-002 | Starting drawer rejects negative | -$50.00 | Error: "Must be positive" | P1 |
| TC-FORM-003 | Cash sales accepts valid amount | $1000.00 | No validation error | P0 |
| TC-FORM-004 | Cash sales rejects negative | -$100.00 | Error: "Must be positive or zero" | P1 |
| TC-FORM-005 | Closing drawer validation with cash sales | Start: $500, Sales: $1000, Close: $450 | Error: "Must be >= starting + cash sales" | P0 |
| TC-FORM-006 | Cash tips calculated correctly | Start: $500, Sales: $1000, Close: $1800 | Cash tips: $300 displayed | P0 |
| TC-FORM-007 | Hours worked validates range | 17 hours | Error: "Max 16 hours" | P1 |
| TC-FORM-008 | Hours worked accepts decimals | 4.5 hours | No validation error | P0 |
| TC-FORM-009 | At least one employee required | Empty employee list | Error: "Add at least one employee" | P0 |
| TC-FORM-010 | At least one server required | Only support staff, no servers | Error: "At least one server required" | P0 |
| TC-FORM-011 | Date cannot be more than 30 days ago | Date 31 days ago | Error: "Too far in past" | P2 |
| TC-FORM-012 | Duplicate employee detection | Same employee added twice | Error: "Employee already added" | P1 |

#### 3.2.2 Calculation Preview Tests

**Test Suite: `TipCalculationPreview`**

| Test ID | Test Case | Input | Expected Output | Priority |
|---------|-----------|-------|-----------------|----------|
| TC-PREV-001 | Preview updates when drawer changes | Update closing drawer | Preview recalculates in real-time | P0 |
| TC-PREV-002 | Preview updates when employee added | Add new employee | Preview includes new employee | P0 |
| TC-PREV-003 | Preview shows "NOT SAVED" warning | Any preview | Clear warning displayed | P1 |
| TC-PREV-004 | Preview matches final calculation | Same data | Preview = final (within $0.01) | P0 |

#### 3.2.3 Routing & Navigation Tests

**Test Suite: `AppRouter`**

| Test ID | Test Case | Input | Expected Output | Priority |
|---------|-----------|-------|-----------------|----------|
| TC-ROUTE-001 | Admin can access admin routes | Navigate to /admin | Page loads | P0 |
| TC-ROUTE-002 | Manager cannot access admin routes | Navigate to /admin | Redirect to /manager | P0 |
| TC-ROUTE-003 | Unauthenticated user redirects | Navigate to /dashboard | Redirect to /login | P0 |
| TC-ROUTE-004 | Employee can only access employee portal | Navigate to /manager | 403 or redirect | P0 |

---

## 4. Integration Test Scenarios

### 4.1 API Endpoint Tests

#### 4.1.1 Tip Entry API Tests

**Test Suite: `POST /api/v1/tips/entries`**

| Test ID | Test Case | Request | Expected Response | Priority |
|---------|-----------|---------|-------------------|----------|
| TC-API-001 | Create tip entry successfully | Valid tip entry JSON | 201 Created + entry data | P0 |
| TC-API-002 | Create tip entry with invalid data | Missing required fields | 400 Bad Request + validation errors | P0 |
| TC-API-003 | Create tip entry without auth | No JWT token | 401 Unauthorized | P0 |
| TC-API-004 | Create tip entry for other tenant | tenant_id in body differs from JWT | Entry created with JWT tenant_id | P0 |
| TC-API-005 | Create tip entry with cash sales | Include cashSales field | Cash tips calculated correctly | P0 |
| TC-API-006 | Create tip entry without cash sales (defaults to 0) | Omit cashSales field | cashSales = 0, cash tips = closing - starting | P1 |
| TC-API-007 | Duplicate entry for same date | Entry already exists | 409 Conflict or warning | P0 |

**Test Suite: `GET /api/v1/tips/entries`**

| Test ID | Test Case | Request | Expected Response | Priority |
|---------|-----------|---------|-------------------|----------|
| TC-API-008 | Get all tip entries | GET request | 200 OK + paginated entries | P0 |
| TC-API-009 | Get entries filtered by date range | Query params: ?start_date&end_date | Entries within range | P1 |
| TC-API-010 | Get entries returns only own tenant | Manager JWT | Only entries for manager's tenant | P0 |
| TC-API-011 | Pagination works correctly | ?page=2&limit=10 | Second page, 10 items | P1 |

**Test Suite: `PATCH /api/v1/tips/entries/:id`**

| Test ID | Test Case | Request | Expected Response | Priority |
|---------|-----------|---------|-------------------|----------|
| TC-API-012 | Edit tip entry creates new record | Updated entry data | 200 OK + new entry ID | P0 |
| TC-API-013 | Old entry soft deleted after edit | Edit operation | Old entry: is_deleted=true | P0 |
| TC-API-014 | Audit log created on edit | Edit operation | Audit log with old/new values | P0 |
| TC-API-015 | Cannot edit other tenant's entry | Entry from different tenant | 403 Forbidden or 404 Not Found | P0 |

#### 4.1.2 Employee API Tests

**Test Suite: `POST /api/v1/employees`**

| Test ID | Test Case | Request | Expected Response | Priority |
|---------|-----------|---------|-------------------|----------|
| TC-API-016 | Create employee successfully | Valid employee data | 201 Created + employee data | P0 |
| TC-API-017 | Duplicate email rejected | Email already exists | 409 Conflict | P0 |
| TC-API-018 | Invalid role rejected | Role = "CASHIER" | 400 Bad Request | P1 |
| TC-API-019 | Manager can create employees | Manager JWT | 201 Created | P0 |
| TC-API-020 | Employee cannot create employees | Employee JWT | 403 Forbidden | P0 |

#### 4.1.3 Magic Link API Tests

**Test Suite: `POST /api/v1/auth/magic-link`**

| Test ID | Test Case | Request | Expected Response | Priority |
|---------|-----------|---------|-------------------|----------|
| TC-API-021 | Request magic link successfully | Valid employee email | 200 OK + "Email sent" message | P0 |
| TC-API-022 | Rate limit enforced (email) | 4th request in 1 hour | 429 Too Many Requests | P0 |
| TC-API-023 | Rate limit enforced (IP) | 11th request from IP in 1 hour | 429 Too Many Requests | P0 |
| TC-API-024 | Invalid email address | Non-existent email | 404 Not Found | P1 |

**Test Suite: `GET /api/v1/auth/verify-magic-link`**

| Test ID | Test Case | Request | Expected Response | Priority |
|---------|-----------|---------|-------------------|----------|
| TC-API-025 | Verify valid magic link | Valid token | 200 OK + JWT token | P0 |
| TC-API-026 | Expired token rejected | Token > 15 min old | 401 Unauthorized | P0 |
| TC-API-027 | Used token rejected | Token already used | 401 Unauthorized | P0 |
| TC-API-028 | Invalid token rejected | Non-existent token | 401 Unauthorized | P0 |

### 4.2 Database Integration Tests

#### 4.2.1 CRUD Operations

| Test ID | Test Case | Operation | Expected Result | Priority |
|---------|-----------|-----------|-----------------|----------|
| TC-DB-001 | Insert tip entry | INSERT into tip_entries | Record created with generated columns | P0 |
| TC-DB-002 | Computed columns calculate correctly | INSERT with drawer values | cash_tips = closing - starting | P0 |
| TC-DB-003 | Unique constraint enforced | Duplicate active entry for date | Error or constraint violation | P0 |
| TC-DB-004 | Foreign key cascade delete | Delete tenant | All related data deleted | P1 |
| TC-DB-005 | Soft delete preserves data | UPDATE is_deleted = true | Record still in database | P0 |
| TC-DB-006 | Audit log immutable | UPDATE/DELETE audit_logs | Operation rejected or fails | P0 |

#### 4.2.2 Transaction Tests

| Test ID | Test Case | Operation | Expected Result | Priority |
|---------|-----------|-----------|-----------------|----------|
| TC-TX-001 | Tip entry + calculations atomic | Create entry with calculations | Both succeed or both rollback | P0 |
| TC-TX-002 | Edit creates new + deletes old atomically | Edit operation | Both operations succeed together | P0 |
| TC-TX-003 | Partial failure rolls back | One calculation fails | Entire transaction rolled back | P0 |

---

## 5. End-to-End Test Scenarios

### 5.1 Critical User Workflows

#### 5.1.1 Manager Complete Workflow

**Test ID: TC-E2E-001**
**Test Case:** Manager creates daily tip entry from login to completion

**Prerequisites:**
- Manager account created and active
- At least 3 employees in system (2 servers, 1 busser)
- Shifts configured (Lunch, Dinner)

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login page displays |
| 2 | Enter manager email + password | Redirected to manager dashboard |
| 3 | Click "New Tip Entry" button | Tip entry form displays |
| 4 | Select today's date | Date field populated |
| 5 | Enter starting drawer: $500.00 | Value accepted |
| 6 | Enter closing drawer: $1800.00 | Value accepted |
| 7 | Enter cash sales: $1000.00 | Cash tips calculated: $300.00 |
| 8 | Enter electronic tips: $450.00 | Total tips calculated: $750.00 |
| 9 | Add Server A: Lunch, 8 hours | Employee added to list |
| 10 | Add Server B: Dinner, 6 hours | Employee added to list |
| 11 | Add Busser: Dinner, 4 hours | Employee added to list |
| 12 | Review live preview | Preview shows calculated tips for each employee |
| 13 | Click "Calculate Tips" | Calculation results display |
| 14 | Review breakdown for each employee | All employees show: hours, tips, total pay, rate |
| 15 | Click "Confirm & Save" | Success message displays |
| 16 | Navigate to "Tip History" | New entry appears in list |
| 17 | Click on entry to view details | Full details match saved data |

**Success Criteria:**
- Tip calculation accurate (verified manually)
- All data saved correctly to database
- No errors or warnings displayed
- Time to complete: < 5 minutes

---

#### 5.1.2 Employee Magic Link Login

**Test ID: TC-E2E-002**
**Test Case:** Employee receives magic link and views tip history

**Prerequisites:**
- Employee record exists in database
- Employee has tips for last 30 days

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to employee portal URL | Employee login page displays |
| 2 | Enter employee email address | Email field accepts input |
| 3 | Click "Send Magic Link" | "Check your email" message displays |
| 4 | Open email inbox | Magic link email received (< 1 minute) |
| 5 | Click magic link in email | Redirected to employee dashboard |
| 6 | View dashboard | 30-day tip history displays |
| 7 | Verify tip amounts for dates worked | Amounts match expected values |
| 8 | View monthly summary | Total tips, hours, avg rate displayed |
| 9 | Filter by date range (last 7 days) | Only last 7 days of tips shown |
| 10 | Try to navigate to manager pages | Access denied or 403 error |
| 11 | Wait 15 minutes | Session expires, redirected to login |
| 12 | Try to reuse same magic link | Error: "Link already used" |

**Success Criteria:**
- Magic link delivered within 1 minute
- Employee can only see own data
- Session timeout enforces 15-minute limit
- Magic link single-use enforced

---

#### 5.1.3 Admin Configuration Workflow

**Test ID: TC-E2E-003**
**Test Case:** Admin configures shifts and support staff percentages

**Prerequisites:**
- Admin account with access to tenant

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Admin dashboard displays |
| 2 | Navigate to "Configuration" > "Shifts" | Shifts list displays |
| 3 | Click "Add New Shift" | Shift creation form displays |
| 4 | Enter shift name: "Happy Hour" | Name accepted |
| 5 | Click "Save" | Shift created, appears in list |
| 6 | Navigate to "Configuration" > "Support Staff" | Support staff config displays |
| 7 | Set Busser percentage to 20% | Value accepted |
| 8 | Set Expeditor percentage to 15% | Value accepted |
| 9 | Set effective date to tomorrow | Date accepted |
| 10 | Click "Save Changes" | Success message, config saved |
| 11 | Navigate to employees | Employee list displays |
| 12 | Create new employee (Server role) | Employee created |
| 13 | Update employee hourly rate | Rate history record created |
| 14 | Logout and login as manager | Manager dashboard displays |
| 15 | Create tip entry using new shift | "Happy Hour" shift available in dropdown |
| 16 | Add busser to entry | 20% percentage applied (if tomorrow or later) |

**Success Criteria:**
- New shift immediately available to managers
- Support staff percentage changes take effect on correct date
- Employee rate history tracked correctly

---

#### 5.1.4 Edit Tip Entry Workflow

**Test ID: TC-E2E-004**
**Test Case:** Manager edits existing tip entry (audit trail verification)

**Prerequisites:**
- Tip entry exists from previous day
- Manager has edit permissions

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as manager | Manager dashboard displays |
| 2 | Navigate to "Tip History" | List of tip entries displays |
| 3 | Click on entry to edit | Entry details display |
| 4 | Click "Edit Entry" button | Edit form pre-populated with data |
| 5 | Change electronic tips amount | New amount accepted |
| 6 | Remove one employee | Employee removed from list |
| 7 | Add different employee | New employee added |
| 8 | Click "Recalculate" | New calculation preview shows |
| 9 | Click "Save Changes" | Confirmation prompt displays |
| 10 | Confirm changes | Success message, redirected to entry view |
| 11 | Verify new calculations | Updated amounts display |
| 12 | Navigate to original entry ID | Shows "Replaced by [new entry]" message |
| 13 | Login as admin | Admin dashboard displays |
| 14 | Navigate to "Audit Logs" | Audit logs display |
| 15 | Search for edited entry | Audit log shows: old values, new values, who edited, when |

**Success Criteria:**
- Original entry preserved (soft deleted)
- New entry created with correct data
- Audit trail complete and accurate
- Link between old and new entry maintained

---

#### 5.1.5 Multi-Shift Complex Scenario

**Test ID: TC-E2E-005**
**Test Case:** Tip calculation with servers working multiple shifts and support staff cap enforcement

**Prerequisites:**
- 4 shifts configured: Breakfast, Lunch, Dinner, Late Night
- 3 servers, 2 bussers, 1 expeditor in system
- Support staff percentages: Busser 20%, Expeditor 15%

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as manager | Dashboard displays |
| 2 | Create new tip entry | Form displays |
| 3 | Enter total tips: $2000.00 | Amount accepted |
| 4 | Add Server A: Breakfast + Lunch, 8 hrs | Added |
| 5 | Add Server B: Lunch + Dinner, 10 hrs | Added |
| 6 | Add Server C: Dinner + Late Night, 6 hrs | Added |
| 7 | Add Busser 1: Lunch + Dinner, 8 hrs | Added |
| 8 | Add Busser 2: Late Night, 4 hrs | Added |
| 9 | Add Expeditor: All shifts, 12 hrs | Added |
| 10 | Review live preview | All employees show estimated tips |
| 11 | Click "Calculate" | Final calculations display |
| 12 | Verify server tips prorated by hours | A: $666.67, B: $833.33, C: $500.00 (24 hrs total) |
| 13 | Verify Busser 1 tips from shared shifts | From servers B and C (Lunch + Dinner) |
| 14 | Verify Busser 2 tips from shared shift | From server C only (Late Night) |
| 15 | Verify Expeditor tips from all servers | From A, B, C (all shifts) |
| 16 | Check if cap applied to any support staff | If support staff > highest server, capped |
| 17 | Verify total distributed = $2000.00 | Sum matches exactly |
| 18 | Confirm and save | Entry saved successfully |

**Success Criteria:**
- Server tips prorated correctly by total hours (not by shift)
- Support staff only receive tips from servers they worked with
- Cap enforced correctly (highest server on shared shift)
- Total distributed equals exact tip pool amount
- Complex scenario completes without errors

---

### 5.2 Exploratory Testing Scenarios

**Test ID: TC-E2E-006**
**Test Case:** Exploratory testing - edge cases and unusual scenarios

**Testing Areas:**
- Try to break form validation (special characters, emoji, SQL injection attempts)
- Rapid clicking of buttons (double-submit prevention)
- Browser back button during multi-step workflow
- Network interruption during save
- Session timeout during data entry (data preservation)
- Very large tip amounts ($100,000+)
- Many employees (50 employees in single entry)
- Simultaneous edits by two managers
- Different browsers (Chrome, Firefox, Safari, Edge)
- Mobile devices (responsive design)
- Screen readers (accessibility)

---

## 6. Security Test Scenarios

### 6.1 Authentication & Authorization Tests

| Test ID | Test Case | Attack Vector | Expected Result | Priority |
|---------|-----------|---------------|-----------------|----------|
| TC-SEC-001 | SQL Injection in login | Email: `admin'--` | Login fails, no SQL error exposed | P0 |
| TC-SEC-002 | XSS in employee name | Name: `<script>alert('xss')</script>` | Stored safely, displayed escaped | P0 |
| TC-SEC-003 | JWT token tampering | Modify role in JWT | 401 Unauthorized, token rejected | P0 |
| TC-SEC-004 | Brute force login attempts | 10 failed login attempts | Account locked after 5 attempts | P0 |
| TC-SEC-005 | Magic link token guessing | Random tokens | All rejected (cryptographically secure) | P0 |
| TC-SEC-006 | CSRF attack | Cross-site form submission | CSRF token validation fails | P1 |
| TC-SEC-007 | Session fixation | Reuse old session ID | Session ID regenerated on login | P1 |
| TC-SEC-008 | Password requirements | Weak password: "123456" | Rejected, min requirements enforced | P0 |

### 6.2 Multi-Tenant Security Tests

| Test ID | Test Case | Attack Vector | Expected Result | Priority |
|---------|-----------|---------|-----------------|----------|
| TC-SEC-009 | Access other tenant's data via API | Modify tenant_id in request | 403 Forbidden or data from own tenant only | P0 |
| TC-SEC-010 | SQL injection to bypass tenant filter | Tenant filter bypass attempt | Tenant isolation maintained | P0 |
| TC-SEC-011 | Horizontal privilege escalation | Manager A tries to access Manager B's data (same tenant) | Allowed (same tenant) | P1 |
| TC-SEC-012 | Vertical privilege escalation | Employee tries to access /api/v1/admin/* | 403 Forbidden | P0 |

### 6.3 Data Security Tests

| Test ID | Test Case | Test Method | Expected Result | Priority |
|---------|-----------|-------------|-----------------|----------|
| TC-SEC-013 | Database encryption at rest | Check RDS settings | AES-256 encryption enabled | P0 |
| TC-SEC-014 | TLS 1.3 for data in transit | SSL Labs test | A+ rating, TLS 1.3 | P0 |
| TC-SEC-015 | Secrets not in source code | Code review | No hardcoded credentials | P0 |
| TC-SEC-016 | API keys in environment variables | Check deployment | All secrets in AWS Secrets Manager | P0 |
| TC-SEC-017 | Password hashing | Check database | Passwords hashed with bcrypt/Argon2 | P0 |
| TC-SEC-018 | Sensitive data in logs | Review CloudWatch logs | No PII, passwords, tokens in logs | P1 |

### 6.4 OWASP Top 10 Tests

| OWASP Risk | Test ID | Test Case | Priority |
|------------|---------|-----------|----------|
| A01: Broken Access Control | TC-SEC-019 | Verify all endpoints require auth | P0 |
| A02: Cryptographic Failures | TC-SEC-020 | Check TLS config, password hashing | P0 |
| A03: Injection | TC-SEC-021 | SQL injection, NoSQL injection tests | P0 |
| A04: Insecure Design | TC-SEC-022 | Review architecture for security flaws | P1 |
| A05: Security Misconfiguration | TC-SEC-023 | Check for default credentials, unnecessary features | P1 |
| A06: Vulnerable Components | TC-SEC-024 | npm audit, dependency scanning | P1 |
| A07: Auth Failures | TC-SEC-025 | Brute force, weak passwords | P0 |
| A08: Data Integrity Failures | TC-SEC-026 | Verify audit trails, checksums | P1 |
| A09: Logging Failures | TC-SEC-027 | Verify all actions logged | P1 |
| A10: Server-Side Request Forgery | TC-SEC-028 | SSRF attempts on API | P2 |

---

## 7. Performance Test Scenarios

### 7.1 Load Testing

**Test ID: TC-PERF-001**
**Test Case:** 100 concurrent users creating tip entries

**Test Setup:**
- 100 virtual users
- Ramp-up time: 5 minutes
- Test duration: 30 minutes
- Scenario: Each user creates 1 tip entry every 2 minutes

**Success Criteria:**
- Response time p95 < 3 seconds
- Response time p99 < 5 seconds
- Error rate < 1%
- No database connection errors
- No Lambda cold starts after warmup

---

**Test ID: TC-PERF-002**
**Test Case:** Large tip entry (50 employees)

**Test Setup:**
- Single tip entry
- 50 employees (30 servers, 15 bussers, 5 expeditors)
- Multiple shifts per employee
- Complex calculation scenario

**Success Criteria:**
- Calculation completes in < 5 seconds
- Accurate results
- No timeout errors
- Database transaction completes successfully

---

**Test ID: TC-PERF-003**
**Test Case:** Dashboard load with 1 year of data

**Test Setup:**
- Single tenant with 365 tip entries
- 50 employees per entry
- Total: 18,250 calculation records
- Manager loads dashboard

**Success Criteria:**
- Initial page load < 2 seconds
- Pagination loads subsequent pages < 1 second
- Search/filter operations < 1 second
- No memory leaks in browser

---

**Test ID: TC-PERF-004**
**Test Case:** CSV export of 1 year data

**Test Setup:**
- Generate CSV export for full year
- 365 days × 50 employees = 18,250 rows
- Include all fields (date, employee, hours, tips, etc.)

**Success Criteria:**
- Export completes in < 10 seconds
- File size < 10 MB
- All data accurate
- No timeout errors

---

### 7.2 Stress Testing

**Test ID: TC-PERF-005**
**Test Case:** Database connection pool exhaustion

**Test Setup:**
- Gradually increase concurrent users
- Monitor RDS connection count
- Find breaking point

**Success Criteria:**
- System gracefully handles max connections
- Error messages helpful (not cryptic)
- Recovery when load decreases
- Document max concurrent users supported

---

**Test ID: TC-PERF-006**
**Test Case:** Lambda cold start latency

**Test Setup:**
- First request after 15 minutes idle
- Measure cold start time

**Success Criteria:**
- Cold start < 3 seconds
- Warm requests < 500ms
- Provisioned concurrency reduces cold starts

---

### 7.3 Endurance Testing

**Test ID: TC-PERF-007**
**Test Case:** 24-hour continuous operation

**Test Setup:**
- Moderate load (20 concurrent users)
- Run for 24 hours
- Monitor for memory leaks, degradation

**Success Criteria:**
- No performance degradation over time
- No memory leaks in Lambda functions
- Database connections properly released
- CloudWatch metrics stable

---

## 8. Test Data Requirements

### 8.1 Test Tenants

| Tenant ID | Name | Purpose | Data Volume |
|-----------|------|---------|-------------|
| tenant-test-01 | Small Cafe | Small business scenario | 5 employees, 30 days data |
| tenant-test-02 | Medium Restaurant | Medium business | 20 employees, 90 days data |
| tenant-test-03 | Large Restaurant Chain | Large scale testing | 50 employees, 365 days data |
| tenant-test-04 | Multi-Location | Multi-tenant testing | 3 locations, 15 employees each |

### 8.2 Test Users

| Role | Email | Purpose | Tenant |
|------|-------|---------|--------|
| Admin | admin@test.com | Full admin access | All tenants |
| Manager | manager1@test.com | Standard manager | tenant-test-01 |
| Manager | manager2@test.com | Different tenant | tenant-test-02 |
| Employee | employee1@test.com | Server | tenant-test-01 |
| Employee | employee2@test.com | Busser | tenant-test-01 |
| Employee | employee3@test.com | Expeditor | tenant-test-01 |

### 8.3 Test Tip Entries

**Scenarios to create:**
1. Simple entry: 2 servers, equal hours, $1000 tips
2. Complex entry: 5 employees, multiple shifts, support staff with cap
3. Edge case: 1 server, 50 employees total (max)
4. Decimal hours: 4.5, 7.25, 3.75 hours
5. Large amount: $10,000+ tip pool
6. Small amount: $10.00 tip pool (rounding test)
7. Historical entries: 30, 60, 90, 180, 365 days old

### 8.4 Test Data Generation

**Scripts to create:**
```bash
# scripts/seed-test-data.ts
- createTestTenants()
- createTestUsers()
- createTestEmployees()
- createTestShifts()
- createTestTipEntries(days: number)
- createTestSupportStaffConfig()
```

---

## 9. Test Environment Setup

### 9.1 Environment Configuration

| Environment | Purpose | Infrastructure | Data |
|-------------|---------|----------------|------|
| **Local** | Developer testing | Docker Compose (Postgres, Redis) | Minimal seed data |
| **Dev** | Integration testing | AWS (db.t3.micro, Lambda) | Full test dataset |
| **Staging** | UAT, E2E tests | AWS (production-like) | Sanitized production copy |
| **Production** | Live system | AWS (Multi-AZ, high availability) | Real data |

### 9.2 Test Database Setup

**Local Development:**
```bash
# Start test database
docker-compose up -d postgres

# Run migrations
npx prisma migrate dev

# Seed test data
npm run seed:test

# Reset database (clean slate)
npm run db:reset
```

**CI/CD Pipeline:**
```yaml
# .github/workflows/test.yml
- name: Setup test database
  run: |
    docker-compose up -d postgres
    npx prisma migrate deploy
    npm run seed:test

- name: Run tests
  run: npm test

- name: Teardown
  run: docker-compose down -v
```

### 9.3 Test Tools Installation

```bash
# Install testing dependencies
npm install --save-dev \
  jest \
  @types/jest \
  ts-jest \
  supertest \
  @testing-library/react \
  @testing-library/jest-dom \
  @playwright/test \
  artillery \

# Install code coverage
npm install --save-dev nyc

# Install security testing tools
npm install --save-dev \
  npm-audit \
  snyk
```

---

## 10. Entry & Exit Criteria

### 10.1 Entry Criteria

**Prerequisites before testing begins:**
- [ ] All P0 features implemented and deployed to test environment
- [ ] Test environment accessible and stable
- [ ] Test data seeded successfully
- [ ] Test user accounts created
- [ ] Test documentation complete and reviewed
- [ ] Testing tools installed and configured
- [ ] CI/CD pipeline functional

### 10.2 Exit Criteria

**Requirements to complete testing phase:**
- [ ] All P0 test cases executed and passed
- [ ] 90%+ P1 test cases passed
- [ ] 80%+ code coverage achieved (unit tests)
- [ ] Zero critical (P0) bugs open
- [ ] < 5 high (P1) bugs open
- [ ] All security tests passed
- [ ] Performance benchmarks met
- [ ] E2E tests pass for all critical workflows
- [ ] UAT sign-off received from stakeholders
- [ ] Test summary report completed

### 10.3 Suspension Criteria

**Testing will be suspended if:**
- Test environment becomes unavailable for > 4 hours
- > 10 critical bugs discovered in single test session
- Major architectural flaw discovered requiring redesign
- Database corruption or data loss incident
- Security breach or critical vulnerability discovered

### 10.4 Resumption Criteria

**Testing will resume when:**
- Test environment restored and stable
- Critical bugs fixed and verified
- Architectural changes implemented and deployed
- Data integrity verified
- Security patches applied and validated

---

## 11. Test Execution Schedule

### 11.1 Phase-by-Phase Testing

| Phase | Week | Test Types | Deliverables |
|-------|------|------------|--------------|
| **Phase 1** | Week 1-2 | Unit tests (backend core) | 80% coverage on services |
| **Phase 2** | Week 3-4 | Unit tests (frontend) | 70% coverage on components |
| **Phase 3** | Week 5 | Integration tests (API) | All endpoints tested |
| **Phase 4** | Week 6-7 | Integration tests (DB) | Transaction tests complete |
| **Phase 5** | Week 8-9 | E2E tests (critical flows) | 5 workflows automated |
| **Phase 6** | Week 10 | Security tests | OWASP Top 10 verified |
| **Phase 7** | Week 11 | Performance tests | Benchmarks met |
| **Phase 8** | Week 12 | UAT | Stakeholder sign-off |
| **Phase 9** | Week 13 | Regression tests | Final smoke tests pass |

### 11.2 Daily Testing Activities

**During Development (Weeks 1-11):**
- Developers run unit tests before commit
- CI/CD runs all tests on push to develop branch
- Integration tests run nightly
- Daily standup: review failed tests, blockers

**UAT Phase (Week 12):**
- Monday: UAT kickoff, environment setup
- Tuesday-Thursday: Stakeholders execute test scenarios
- Friday: Bug review, prioritization meeting

**Pre-Production (Week 13):**
- Monday: Final regression testing
- Tuesday: Performance testing
- Wednesday: Security audit
- Thursday: Staging deployment, smoke tests
- Friday: Go/No-Go decision meeting

---

## 12. Defect Management

### 12.1 Bug Severity Levels

| Severity | Description | Example | Response Time | Resolution Target |
|----------|-------------|---------|---------------|-------------------|
| **P0 - Critical** | System unusable, data loss, security breach | Tip calculations wrong, multi-tenant leak | Immediate | 24 hours |
| **P1 - High** | Major feature broken, workaround exists | Cannot create tip entry | 24 hours | 3 days |
| **P2 - Medium** | Minor feature broken, cosmetic issue | UI alignment off, slow load | 3 days | 1 week |
| **P3 - Low** | Nice-to-have, enhancement | Better error message | 1 week | Backlog |

### 12.2 Bug Reporting Template

```markdown
## Bug Report

**Bug ID:** BUG-001
**Title:** [Short description]
**Severity:** P0/P1/P2/P3
**Status:** Open/In Progress/Fixed/Closed
**Reporter:** [Name]
**Assigned To:** [Name]
**Date Found:** YYYY-MM-DD

### Environment
- Browser: Chrome 120
- OS: Windows 11
- Environment: Staging
- User Role: Manager

### Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Screenshots/Videos
[Attach if applicable]

### Console Errors
[Paste error messages]

### Additional Notes
[Any other relevant information]
```

### 12.3 Bug Workflow

```
[New Bug] → [Triaged] → [Assigned] → [In Progress] → [Fixed] → [Testing] → [Verified] → [Closed]
                ↓
          [Deferred/Won't Fix]
```

**Triage Process:**
1. Bug reported by tester/developer
2. Test lead reviews within 4 hours
3. Severity assigned (P0/P1/P2/P3)
4. Bug assigned to developer
5. Developer estimates effort
6. Bug prioritized in sprint backlog

---

## 13. Risk Assessment

### 13.1 Testing Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Test environment downtime | High | Medium | Maintain local test environment, automate setup |
| Insufficient test data | Medium | Low | Automated data generation scripts |
| Test automation delays | Medium | Medium | Allocate time in sprint for test development |
| Complex scenarios hard to test | High | High | Detailed test scenarios, pair testing |
| Performance issues found late | High | Medium | Performance tests in Week 11 (not Week 13) |
| Security vulnerabilities | High | Low | Security tests early and often, OWASP ZAP |
| UAT stakeholders unavailable | Medium | Medium | Schedule UAT in advance, backup testers |
| Flaky E2E tests | Medium | High | Investigate flakiness, add retries, improve waits |

### 13.2 Product Risks

| Risk | Impact | Probability | Testing Focus |
|------|--------|-------------|---------------|
| Incorrect tip calculations | **Critical** | Medium | Extensive unit tests, manual verification |
| Multi-tenant data leakage | **Critical** | Low | Security tests, penetration testing |
| Poor performance with 50 employees | High | Medium | Load testing with max data |
| Data loss on edit | High | Low | Transaction tests, rollback scenarios |
| Magic link security bypass | High | Low | Rate limiting tests, token validation |
| Audit trail gaps | Medium | Low | Comprehensive audit log tests |

---

## 14. Approval & Sign-off

### 14.1 Test Plan Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Test Lead | | | |
| Technical Lead | | | |
| Product Owner | | | |
| QA Manager | | | |

### 14.2 UAT Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Restaurant Owner (Pilot 1) | | | |
| Restaurant Manager (Pilot 2) | | | |
| Business Stakeholder | | | |
| Product Owner | | | |

### 14.3 Production Release Approval

| Role | Name | Signature | Date | Go/No-Go |
|------|------|-----------|------|----------|
| Test Lead | | | | ☐ Go ☐ No-Go |
| Technical Lead | | | | ☐ Go ☐ No-Go |
| Product Owner | | | | ☐ Go ☐ No-Go |
| Security Officer | | | | ☐ Go ☐ No-Go |

**Criteria for Go:**
- All P0 bugs closed
- < 5 P1 bugs open (with mitigation plan)
- All critical E2E tests passing
- Security audit passed
- Performance benchmarks met
- UAT sign-off received

---

## Appendix A: Test Execution Checklist

### Pre-Testing Checklist
- [ ] Test plan reviewed and approved
- [ ] Test environment provisioned
- [ ] Test data seeded
- [ ] Test user accounts created
- [ ] Testing tools configured
- [ ] Team trained on test scenarios
- [ ] Defect tracking system ready

### During Testing Checklist
- [ ] Execute test scenarios per schedule
- [ ] Log all defects immediately
- [ ] Update test execution status daily
- [ ] Communicate blockers in standup
- [ ] Retest fixed bugs
- [ ] Update test documentation

### Post-Testing Checklist
- [ ] All test cases executed
- [ ] Test results documented
- [ ] Test summary report created
- [ ] Lessons learned captured
- [ ] Test artifacts archived
- [ ] Sign-off obtained

---

## Appendix B: Test Metrics

### Metrics to Track

**Test Execution Metrics:**
- Total test cases: Planned vs. Executed
- Pass rate: (Passed / Executed) × 100
- Defect detection rate: Bugs found per test case
- Test case effectiveness: Bugs found / Total bugs

**Defect Metrics:**
- Total defects by severity (P0/P1/P2/P3)
- Defect resolution time (average)
- Defect rejection rate (invalid/duplicate)
- Reopen rate

**Code Coverage Metrics:**
- Unit test coverage: % of code covered
- Branch coverage: % of branches covered
- Integration test coverage: % of endpoints covered

**Performance Metrics:**
- Average response time
- p95, p99 response times
- Throughput (requests per second)
- Error rate (%)

**Schedule Metrics:**
- Test execution progress (% complete)
- Delayed test cases
- Blocked test cases

---

**Document End**

*This test plan is a living document and should be updated throughout the project lifecycle as requirements evolve and new risks are identified.*
