# Technical Design Document (TDD)
## Tip Pooling Management System

**Document Version:** 1.0  
**Last Updated:** November 9, 2025  
**Technical Lead:** [To be filled]  
**Status:** Draft

---

## 1. System Overview

### 1.1 Architecture Overview
The Tip Pooling Management System is a cloud-native, multi-tenant web application built using a modern three-tier architecture:

- **Presentation Layer:** React.js single-page application (SPA)
- **Application Layer:** Node.js/Express.js REST API
- **Data Layer:** PostgreSQL relational database with multi-tenant schema design

### 1.2 Technology Stack Recommendation

#### Cloud Platform Comparison

**AWS vs Google Cloud:**

| Factor | AWS | Google Cloud |
|--------|-----|--------------|
| Market Maturity | Most mature, extensive services | Rapidly growing, innovative |
| Pricing | Competitive, complex pricing | Simpler pricing, often cheaper for compute |
| Database | RDS (PostgreSQL) | Cloud SQL (PostgreSQL) |
| Learning Curve | Steeper, more options | Gentler, better documentation |
| Multi-tenant Support | Excellent | Excellent |
| Security | Industry-leading | Industry-leading |
| Ecosystem | Largest marketplace and integrations | Growing ecosystem |
| Global Infrastructure | Most extensive (33 regions) | Extensive (40+ regions) |

**Recommendation: Amazon Web Services (AWS)**

**Rationale:**
1. Most mature cloud platform with proven enterprise reliability
2. Largest ecosystem of third-party integrations and tools
3. Most extensive global infrastructure for future expansion
4. AWS Lambda + API Gateway for serverless architecture (pay per request)
5. RDS PostgreSQL with automated backups and high availability
6. Cognito for user authentication (fully managed)
7. Extensive documentation and largest community support
8. Better long-term scaling options as business grows

#### Primary Technology Stack

**Frontend:**
- **Framework:** React 18.x
- **UI Library:** Material-UI (MUI) v5 - professional, accessible, mobile-responsive
- **State Management:** React Context API + React Query (for server state)
- **Routing:** React Router v6
- **Form Handling:** React Hook Form + Zod (validation)
- **Date Handling:** date-fns
- **Charts:** Recharts (for reporting)
- **HTTP Client:** Axios

**Backend:**
- **Runtime:** Node.js 20.x LTS
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (type safety)
- **Authentication:** AWS Cognito (user pools and identity pools)
- **API Documentation:** Swagger/OpenAPI 3.0
- **Validation:** Zod (shared with frontend)
- **ORM:** Prisma 5.x (type-safe database client)
- **Testing:** Jest + Supertest

**Database:**
- **Primary Database:** PostgreSQL 15 (Amazon RDS)
- **Schema:** Multi-tenant with tenant isolation
- **Migrations:** Prisma Migrate
- **Backups:** Automated RDS backups (every 6 hours)

**Infrastructure (AWS):**
- **Compute:** AWS Lambda + API Gateway (serverless API)
- **Database:** Amazon RDS PostgreSQL (Multi-AZ for high availability)
- **Storage:** Amazon S3 (for backups, exports, frontend hosting)
- **Authentication:** AWS Cognito
- **Email:** Amazon SES (Simple Email Service)
- **CDN:** Amazon CloudFront
- **Monitoring:** Amazon CloudWatch + AWS X-Ray
- **Secret Management:** AWS Secrets Manager
- **VPC:** Private subnets for RDS, NAT Gateway for Lambda

**DevOps:**
- **Version Control:** Git (GitHub or GitLab)
- **CI/CD:** AWS CodePipeline + CodeBuild + CodeDeploy
- **Container Registry:** Amazon ECR (if using containers)
- **IaC:** Terraform or AWS CloudFormation

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
│  (Admin, Manager, Employee - Web Browsers & Mobile)          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────────┐
│         Amazon CloudFront (CDN + SSL/TLS)                    │
│              Global Content Delivery                         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                React SPA (Frontend)                          │
│              (Hosted on Amazon S3)                           │
│                                                              │
│  Components: Login, Dashboard, Tip Entry, Reports,          │
│              Employee View, Admin Config                     │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API (JSON)
                     │
┌────────────────────▼────────────────────────────────────────┐
│               Amazon API Gateway                             │
│        (REST API, Request Validation, CORS)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              AWS Lambda Functions (Backend)                  │
│                   (Node.js/TypeScript)                       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  API Routes (Lambda Functions)                   │      │
│  │  • AuthFunction     - Authentication             │      │
│  │  • TenantFunction   - Tenant management          │      │
│  │  • EmployeeFunction - Employee CRUD              │      │
│  │  • TipFunction      - Tip entry & calculation    │      │
│  │  • ReportFunction   - Reporting & exports        │      │
│  │  • ConfigFunction   - System configuration       │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Middleware (Lambda Layers)                      │      │
│  │  • Authentication (JWT validation via Cognito)   │      │
│  │  • Authorization (role-based access)             │      │
│  │  • Tenant isolation (multi-tenancy)              │      │
│  │  • Request validation                            │      │
│  │  • Error handling                                │      │
│  │  • Audit logging                                 │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Business Logic Services                          │      │
│  │  • TipCalculationService                         │      │
│  │  • EmployeeService                               │      │
│  │  • AuditService                                  │      │
│  │  • ReportService                                 │      │
│  │  • EmailService (via SES)                        │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ VPC Connection (via VPC Endpoint)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                      VPC (Private)                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │   Amazon RDS PostgreSQL (Multi-AZ)                 │    │
│  │                                                     │    │
│  │  Tables: tenants, users, employees, shifts,        │    │
│  │          tip_entries, tip_calculations,            │    │
│  │          support_staff_config, audit_logs          │    │
│  │                                                     │    │
│  │  Features: Multi-tenant isolation, soft deletes,   │    │
│  │           temporal data, audit trails              │    │
│  │                                                     │    │
│  │  Read Replica (optional for scaling)               │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘

External AWS Services:
┌────────────────────────────────────┐
│  AWS Cognito User Pools            │  (User authentication, magic links)
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Amazon SES                        │  (Email notifications)
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Amazon S3                         │  (CSV exports, backups, static hosting)
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Amazon CloudWatch + X-Ray         │  (Monitoring, Logging, Tracing)
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  AWS Secrets Manager               │  (Database credentials, API keys)
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  AWS WAF (Optional)                │  (Web Application Firewall)
└────────────────────────────────────┘
```

### 2.2 Multi-Tenant Architecture

**Tenant Isolation Strategy: Shared Database with Tenant ID Column**

Every table includes a `tenant_id` column. All queries are scoped by tenant ID enforced at the middleware level.

**Advantages:**
- Cost-effective (shared infrastructure)
- Easier to manage and deploy updates
- Efficient resource utilization
- Simpler backup and recovery

**Security Measures:**
- Row-level security (RLS) in PostgreSQL
- Middleware enforces tenant context on all queries
- No cross-tenant data access possible
- Tenant ID validation on every request

---

## 3. Data Model

### 3.1 Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│    tenants      │
├─────────────────┤
│ id (PK)         │
│ name            │
│ address         │
│ timezone        │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐      ┌──────────────────┐
│     users       │      │   shifts         │
├─────────────────┤      ├──────────────────┤
│ id (PK)         │      │ id (PK)          │
│ tenant_id (FK)  │      │ tenant_id (FK)   │
│ email           │      │ name             │
│ role (enum)     │      │ is_active        │
│ firebase_uid    │      │ created_at       │
│ created_at      │      │ updated_at       │
│ updated_at      │      └──────────────────┘
└────────┬────────┘
         │                ┌──────────────────────────┐
         │                │ support_staff_config     │
         │                ├──────────────────────────┤
┌────────▼────────┐      │ id (PK)                  │
│   employees     │      │ tenant_id (FK)           │
├─────────────────┤      │ role (enum: BUSSER/EXPED)│
│ id (PK)         │      │ percentage               │
│ tenant_id (FK)  │      │ effective_date           │
│ name            │      │ created_at               │
│ email           │      │ role (enum)         │
│ hourly_rate     │      └──────────────────────────┘
│ is_active       │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │ 1:N
         │
┌────────▼────────────────┐
│   employee_rate_history │
├─────────────────────────┤
│ id (PK)                 │
│ employee_id (FK)        │
│ hourly_rate             │
│ effective_date          │
│ created_at              │
└─────────────────────────┘

┌─────────────────────────┐
│     tip_entries         │
├─────────────────────────┤
│ id (PK)                 │
│ tenant_id (FK)          │
│ entry_date              │
│ manager_id (FK->users)  │
│ starting_drawer         │
│ closing_drawer          │
│ cash_tips (computed)    │
│ electronic_tips         │
│ total_tips (computed)   │
│ is_deleted              │
│ replaced_by_id (FK)     │
│ created_at              │
│ updated_at              │
│ deleted_at              │
└────────┬────────────────┘
         │ 1:N
         │
┌────────▼────────────────┐       ┌──────────────────┐
│   tip_calculations      │ N:M   │ shift_assignment │
├─────────────────────────┤───────┤──────────────────┤
│ id (PK)                 │       │ id (PK)          │
│ tip_entry_id (FK)       │       │ tip_calc_id (FK) │
│ employee_id (FK)        │       │ shift_id (FK)    │
│ role_on_day (enum)      │       │ created_at       │
│ total_hours             │       └──────────────────┘
│ hourly_pay              │
│ base_tips               │
│ support_tips_given      │
│ support_tips_received   │
│ final_tips              │
│ total_pay               │
│ effective_hourly_rate   │
│ created_at              │
└─────────────────────────┘

┌─────────────────────────┐
│      audit_logs         │
├─────────────────────────┤
│ id (PK)                 │
│ tenant_id (FK)          │
│ user_id (FK)            │
│ entity_type             │
│ entity_id               │
│ action (enum)           │
│ old_values (JSONB)      │
│ new_values (JSONB)      │
│ ip_address              │
│ user_agent              │
│ created_at              │
└─────────────────────────┘
```

### 3.2 Database Schema

#### 3.2.1 Tenants Table
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_name ON tenants(name);
```

#### 3.2.2 Users Table
```sql
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    firebase_uid VARCHAR(255) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
```

#### 3.2.3 Employees Table
```sql
CREATE TYPE employee_role AS ENUM ('SERVER', 'BUSSER', 'EXPEDITOR');

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role employee_role NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_active ON employees(tenant_id, is_active);
```

#### 3.2.4 Employee Rate History Table
```sql
CREATE TABLE employee_rate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_history_employee ON employee_rate_history(employee_id, effective_date DESC);
```

#### 3.2.5 Shifts Table
```sql
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_shifts_tenant ON shifts(tenant_id, is_active);
```

#### 3.2.6 Support Staff Configuration Table
```sql
CREATE TABLE support_staff_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role employee_role NOT NULL CHECK (role IN ('BUSSER', 'EXPEDITOR')),
    percentage DECIMAL(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 50),
    effective_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_config_tenant ON support_staff_config(tenant_id, role, effective_date DESC);
```

#### 3.2.7 Tip Entries Table
```sql
CREATE TABLE tip_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    manager_id UUID NOT NULL REFERENCES users(id),
    starting_drawer DECIMAL(10, 2) NOT NULL,
    closing_drawer DECIMAL(10, 2) NOT NULL,
    cash_tips DECIMAL(10, 2) GENERATED ALWAYS AS (closing_drawer - starting_drawer) STORED,
    electronic_tips DECIMAL(10, 2) NOT NULL,
    total_tips DECIMAL(10, 2) GENERATED ALWAYS AS ((closing_drawer - starting_drawer) + electronic_tips) STORED,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    replaced_by_id UUID REFERENCES tip_entries(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE(tenant_id, entry_date, is_deleted) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_tip_entries_tenant_date ON tip_entries(tenant_id, entry_date DESC);
CREATE INDEX idx_tip_entries_active ON tip_entries(tenant_id, is_deleted) WHERE is_deleted = FALSE;
```

#### 3.2.8 Tip Calculations Table
```sql
CREATE TABLE tip_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_entry_id UUID NOT NULL REFERENCES tip_entries(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    role_on_day employee_role NOT NULL,
    total_hours DECIMAL(5, 2) NOT NULL,
    hourly_pay DECIMAL(10, 2) NOT NULL,
    base_tips DECIMAL(10, 2) NOT NULL DEFAULT 0,
    support_tips_given DECIMAL(10, 2) NOT NULL DEFAULT 0,
    support_tips_received DECIMAL(10, 2) NOT NULL DEFAULT 0,
    final_tips DECIMAL(10, 2) NOT NULL,
    total_pay DECIMAL(10, 2) NOT NULL,
    effective_hourly_rate DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tip_calc_entry ON tip_calculations(tip_entry_id);
CREATE INDEX idx_tip_calc_employee ON tip_calculations(employee_id);
```

#### 3.2.9 Shift Assignments Table
```sql
CREATE TABLE shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_calculation_id UUID NOT NULL REFERENCES tip_calculations(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shift_assign_calc ON shift_assignments(tip_calculation_id);
```

#### 3.2.10 Audit Logs Table
```sql
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS');

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    action audit_action NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

### 3.3 Data Access Patterns

#### 3.3.1 Read-Heavy Operations (Optimized with Indexes)
- Employee tip history (past 30 days)
- Manager viewing historical tip entries
- Reports and exports

#### 3.3.2 Write Operations
- Daily tip entry (once per day per tenant)
- Employee CRUD (infrequent)
- Configuration changes (infrequent)

#### 3.3.3 Complex Queries
- Tip calculation algorithm (multiple joins)
- Audit trail queries (JSONB filtering)
- Report generation (aggregations)

---

## 4. API Design

### 4.1 RESTful API Endpoints

#### 4.1.1 Authentication Endpoints

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/magic-link (employee login)
GET    /api/v1/auth/verify-magic-link
```

#### 4.1.2 Tenant Management (Admin Only)

```
POST   /api/v1/tenants
GET    /api/v1/tenants
GET    /api/v1/tenants/:id
PATCH  /api/v1/tenants/:id
DELETE /api/v1/tenants/:id
```

#### 4.1.3 User Management

```
POST   /api/v1/users (create manager/admin)
GET    /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```

#### 4.1.4 Employee Management

```
POST   /api/v1/employees
GET    /api/v1/employees
GET    /api/v1/employees/:id
PATCH  /api/v1/employees/:id
DELETE /api/v1/employees/:id (soft delete)
GET    /api/v1/employees/:id/rate-history
POST   /api/v1/employees/:id/update-rate
```

#### 4.1.5 Shift Configuration

```
POST   /api/v1/shifts
GET    /api/v1/shifts
GET    /api/v1/shifts/:id
PATCH  /api/v1/shifts/:id
DELETE /api/v1/shifts/:id (soft delete)
```

#### 4.1.6 Support Staff Configuration

```
GET    /api/v1/config/support-staff
POST   /api/v1/config/support-staff
GET    /api/v1/config/support-staff/history
```

#### 4.1.7 Tip Entry & Calculation

```
POST   /api/v1/tips/entries (create daily tip entry)
GET    /api/v1/tips/entries (list all entries, paginated)
GET    /api/v1/tips/entries/:id
PATCH  /api/v1/tips/entries/:id (edit - creates new record)
DELETE /api/v1/tips/entries/:id (soft delete)
GET    /api/v1/tips/entries/:id/calculations
POST   /api/v1/tips/calculate (preview calculation before saving)
```

#### 4.1.8 Employee Self-Service

```
GET    /api/v1/employee/my-tips (past 30 days)
GET    /api/v1/employee/my-tips/summary
```

#### 4.1.9 Reporting

```
GET    /api/v1/reports/daily/:date
GET    /api/v1/reports/weekly/:start-date
GET    /api/v1/reports/monthly/:year/:month
POST   /api/v1/reports/export (generate CSV)
```

#### 4.1.10 Audit Logs

```
GET    /api/v1/audit-logs
GET    /api/v1/audit-logs/:entity-type/:entity-id
```

### 4.2 API Request/Response Examples

#### Example: Create Tip Entry

**Request:**
```http
POST /api/v1/tips/entries
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "entryDate": "2025-11-09",
  "startingDrawer": 500.00,
  "closingDrawer": 1250.75,
  "electronicTips": 450.25,
  "employees": [
    {
      "employeeId": "uuid-1",
      "roleOnDay": "SERVER",
      "shifts": ["uuid-shift-1", "uuid-shift-2"],
      "hoursWorked": 8.5
    },
    {
      "employeeId": "uuid-2",
      "roleOnDay": "BUSSER",
      "shifts": ["uuid-shift-2"],
      "hoursWorked": 4.0
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tipEntry": {
      "id": "uuid-entry",
      "entryDate": "2025-11-09",
      "startingDrawer": 500.00,
      "closingDrawer": 1250.75,
      "cashTips": 750.75,
      "electronicTips": 450.25,
      "totalTips": 1201.00,
      "managerId": "uuid-manager",
      "createdAt": "2025-11-09T18:30:00Z"
    },
    "calculations": [
      {
        "employeeId": "uuid-1",
        "employeeName": "John Doe",
        "roleOnDay": "SERVER",
        "totalHours": 8.5,
        "hourlyPay": 127.50,
        "baseTips": 900.75,
        "supportTipsGiven": 18.02,
        "finalTips": 882.73,
        "totalPay": 1010.23,
        "effectiveHourlyRate": 118.85
      },
      {
        "employeeId": "uuid-2",
        "employeeName": "Jane Smith",
        "roleOnDay": "BUSSER",
        "totalHours": 4.0,
        "hourlyPay": 60.00,
        "supportTipsReceived": 18.02,
        "finalTips": 18.02,
        "totalPay": 78.02,
        "effectiveHourlyRate": 19.51
      }
    ]
  }
}
```

### 4.3 Error Handling

**Standard Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "hoursWorked",
        "message": "Hours must be between 0.5 and 16"
      }
    ]
  }
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (not authenticated)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (e.g., duplicate entry)
- 500: Internal Server Error

---

## 5. Business Logic Algorithms

### 5.1 Tip Calculation Algorithm

```typescript
interface Employee {
  id: string;
  name: string;
  roleOnDay: 'SERVER' | 'BUSSER' | 'EXPEDITOR';
  shifts: string[]; // shift IDs
  hoursWorked: number;
  hourlyRate: number;
}

interface SupportStaffConfig {
  role: 'BUSSER' | 'EXPEDITOR';
  percentage: number;
}

function calculateTips(
  totalTipPool: number,
  employees: Employee[],
  supportStaffConfig: SupportStaffConfig[]
): TipCalculation[] {
  
  // Step 1: Separate servers from support staff
  const servers = employees.filter(e => e.roleOnDay === 'SERVER');
  const supportStaff = employees.filter(e => e.roleOnDay !== 'SERVER');
  
  // Step 2: Calculate total server hours
  const totalServerHours = servers.reduce((sum, s) => sum + s.hoursWorked, 0);
  
  // Step 3: Prorate tips to servers based on hours
  const serverCalculations = servers.map(server => {
    const baseTips = (server.hoursWorked / totalServerHours) * totalTipPool;
    
    return {
      employeeId: server.id,
      roleOnDay: server.roleOnDay,
      shifts: server.shifts,
      hoursWorked: server.hoursWorked,
      baseTips,
      supportTipsGiven: 0, // calculated later
      finalTips: baseTips, // adjusted later
    };
  });
  
  // Step 4: Calculate support staff tips
  const supportCalculations = supportStaff.map(support => {
    const config = supportStaffConfig.find(c => c.role === support.roleOnDay);
    const percentage = config ? config.percentage / 100 : 0;
    
    let supportTips = 0;
    
    // Find servers who worked the same shift(s)
    servers.forEach((server, idx) => {
      const sharedShifts = server.shifts.filter(s => support.shifts.includes(s));
      
      if (sharedShifts.length > 0) {
        // Calculate server's tips for shared shifts
        // If server worked multiple shifts, prorate their tips by shift
        const serverTotalShifts = server.shifts.length;
        const serverTipsPerShift = serverCalculations[idx].baseTips / serverTotalShifts;
        const tipsFromSharedShifts = serverTipsPerShift * sharedShifts.length;
        
        // Support staff gets percentage of server's shared shift tips
        const tipsFromThisServer = tipsFromSharedShifts * percentage;
        supportTips += tipsFromThisServer;
        
        // Deduct from server's tips
        serverCalculations[idx].supportTipsGiven += tipsFromThisServer;
        serverCalculations[idx].finalTips -= tipsFromThisServer;
      }
    });
    
    // Step 5: Apply cap - support staff cannot exceed highest server on their shift
    const serversOnSameShift = servers.filter(s => 
      s.shifts.some(shift => support.shifts.includes(shift))
    );
    const highestServerTip = Math.max(
      ...serversOnSameShift.map((_, idx) => serverCalculations[idx].finalTips)
    );
    
    if (supportTips > highestServerTip) {
      supportTips = highestServerTip;
    }
    
    return {
      employeeId: support.id,
      roleOnDay: support.roleOnDay,
      shifts: support.shifts,
      hoursWorked: support.hoursWorked,
      supportTipsReceived: supportTips,
      finalTips: supportTips,
    };
  });
  
  // Step 6: Calculate total compensation
  const allCalculations = [...serverCalculations, ...supportCalculations].map(calc => {
    const employee = employees.find(e => e.id === calc.employeeId);
    const hourlyPay = employee.hoursWorked * employee.hourlyRate;
    const totalPay = hourlyPay + calc.finalTips;
    const effectiveHourlyRate = totalPay / employee.hoursWorked;
    
    return {
      ...calc,
      hourlyPay,
      totalPay,
      effectiveHourlyRate,
    };
  });
  
  return allCalculations;
}
```

### 5.2 Tip Entry Edit/Audit Trail Logic

```typescript
async function editTipEntry(
  originalEntryId: string,
  updatedData: TipEntryInput,
  userId: string
): Promise<TipEntry> {
  
  // Step 1: Retrieve original entry
  const originalEntry = await db.tipEntries.findUnique({
    where: { id: originalEntryId },
    include: { calculations: true }
  });
  
  // Step 2: Create audit log for the edit
  await db.auditLogs.create({
    data: {
      tenantId: originalEntry.tenantId,
      userId,
      entityType: 'TIP_ENTRY',
      entityId: originalEntryId,
      action: 'UPDATE',
      oldValues: originalEntry,
      newValues: updatedData,
    }
  });
  
  // Step 3: Soft delete original entry
  await db.tipEntries.update({
    where: { id: originalEntryId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    }
  });
  
  // Step 4: Create new entry with updated data
  const newEntry = await db.tipEntries.create({
    data: {
      ...updatedData,
      tenantId: originalEntry.tenantId,
      managerId: userId,
    }
  });
  
  // Step 5: Link original to new entry
  await db.tipEntries.update({
    where: { id: originalEntryId },
    data: { replacedById: newEntry.id }
  });
  
  // Step 6: Recalculate tips for new entry
  const calculations = calculateTips(/* ... */);
  await db.tipCalculations.createMany({
    data: calculations.map(calc => ({
      tipEntryId: newEntry.id,
      ...calc
    }))
  });
  
  return newEntry;
}
```

---

## 6. Security Design

### 6.1 Authentication Flow

**Admin/Manager Login:**
1. User enters email + password
2. Frontend sends credentials to AWS Cognito
3. Cognito returns JWT tokens (ID token, Access token, Refresh token)
4. Frontend stores tokens in httpOnly cookies
5. All API requests include ID token in Authorization header
6. API Gateway validates token with Cognito
7. Lambda extracts user ID and tenant ID from token claims
8. Lambda enforces tenant context on all database queries

**Employee Login (Magic Link):**
1. Employee enters email
2. Lambda generates unique token with 15-minute expiry
3. Token stored in DynamoDB or RDS with expiration
4. Lambda triggers SES to send email with magic link (token embedded)
5. Employee clicks link
6. Lambda validates token (not expired, not used, exists in database)
7. Lambda creates temporary Cognito session
8. Employee receives temporary JWT token to access their tips
9. Token marked as used in database

### 6.2 Authorization Matrix

| Role     | Tenants | Users | Employees | Shifts | Config | Tips (Create) | Tips (View) | Tips (Edit) | Reports | Audit Logs |
|----------|---------|-------|-----------|--------|--------|---------------|-------------|-------------|---------|------------|
| Admin    | CRUD    | CRUD  | CRUD      | CRUD   | CRUD   | Yes           | All         | Yes         | All     | Yes        |
| Manager  | Read    | -     | Read      | Read   | Read   | Yes           | Own tenant  | Yes         | Own     | No         |
| Employee | -       | -     | Read self | -      | -      | No            | Own data    | No          | Own     | No         |

### 6.3 Data Security Measures

**Encryption:**
- TLS 1.3 for all data in transit
- AES-256 encryption for data at rest (RDS automatic encryption)
- AWS Secrets Manager for database credentials and API keys
- CloudFront with SSL/TLS certificates (AWS Certificate Manager)

**Access Control:**
- Row-level security (RLS) in PostgreSQL enforcing tenant_id
- JWT token validation via AWS Cognito on every request
- Rate limiting via API Gateway: 1000 requests/5 minutes per user
- CORS configured in API Gateway, restricted to application domain
- Lambda functions in VPC with no direct internet access
- RDS in private subnets, accessible only via VPC

**Input Validation:**
- Zod schemas for all API inputs
- API Gateway request validation models
- SQL injection prevention (Prisma ORM parameterized queries)
- XSS prevention (React escapes by default)
- CSRF tokens for state-changing operations

**Audit Trail:**
- All data modifications logged to RDS audit_logs table
- CloudWatch Logs for all Lambda invocations
- AWS CloudTrail for API-level audit logging
- Immutable audit logs
- IP address and user agent captured
- Retention: 7 years

**Network Security:**
- VPC with public and private subnets
- RDS in private subnet (no internet access)
- Lambda functions with VPC endpoints
- Security groups limiting traffic
- Network ACLs for additional layer of security
- Optional: AWS WAF for web application firewall protection

### 6.4 Compliance

**FLSA (Fair Labor Standards Act) Compliance:**
- Tip pooling restricted to customer-facing employees
- No management/ownership participation in tip pool
- Transparent calculation and distribution
- Complete audit trail for DOL inspections

**Data Privacy:**
- Employee PII minimized (only email required)
- No SSN or financial account info stored
- Employee can request data export (GDPR right to access)
- Data retention policy: 7 years for compliance, then archival/deletion

---

## 7. Performance Optimization

### 7.1 Database Optimization

**Indexes:**
```sql
-- Composite indexes for common queries
CREATE INDEX idx_employees_tenant_active ON employees(tenant_id, is_active);
CREATE INDEX idx_tip_entries_tenant_date ON tip_entries(tenant_id, entry_date DESC);
CREATE INDEX idx_tip_calc_entry_employee ON tip_calculations(tip_entry_id, employee_id);
```

**Query Optimization:**
- Use Prisma's `include` for eager loading (avoid N+1 queries)
- Pagination for large datasets (limit 50 records per page)
- RDS connection pooling using RDS Proxy (max 100 connections)
- Lambda connection management (reuse connections across invocations)

**Caching Strategy:**
- Amazon ElastiCache (Redis) for frequently accessed data
- Cache employee list per tenant (5-minute TTL)
- Cache shift configuration per tenant (1-hour TTL)
- Cache support staff config per tenant (1-hour TTL)
- API Gateway response caching for read-only endpoints (5-minute TTL)
- Invalidate cache on updates using Lambda triggers

### 7.2 API Performance

**Response Time Targets:**
- Simple GET requests: < 200ms
- Tip calculation: < 2 seconds
- Report generation: < 5 seconds
- CSV export: < 10 seconds (async processing with S3)

**Optimization Techniques:**
- Gzip compression in API Gateway
- CloudFront CDN for static assets (React build)
- Lambda response streaming for large payloads
- Lazy loading for frontend components
- Debouncing for search inputs
- Lambda provisioned concurrency for critical functions (reduces cold starts)

### 7.3 Scalability

**Horizontal Scaling:**
- AWS Lambda auto-scales automatically (1000 concurrent executions default)
- API Gateway handles millions of requests per day
- Stateless Lambda design (no session storage in memory)
- Application Load Balancer distributes traffic (if needed)

**Database Scaling:**
- RDS supports read replicas for read-heavy workloads
- Vertical scaling (increase instance size as needed)
- RDS Proxy for connection pooling (reduces connection overhead)
- Aurora PostgreSQL option for extreme scale (future)

**Load Testing:**
- Simulate 100 concurrent users using Artillery or Locust
- Test with 1000+ employees per tenant
- Test with 10+ years of historical data
- Use AWS Lambda with reserved concurrency for predictable performance

---

## 8. Monitoring & Observability

### 8.1 Logging

**Amazon CloudWatch Logs:**
- Lambda function logs (automatic integration)
- API Gateway access logs
- Application logs (structured JSON logging)
- RDS query logs (slow query logging enabled)
- Error logs with stack traces
- Log levels: DEBUG, INFO, WARN, ERROR

**Log Retention:**
- Application logs: 30 days in CloudWatch
- Audit logs: 7 years (stored in RDS + S3 archive)
- Long-term storage: Export to S3 with lifecycle policies

**Log Aggregation:**
- CloudWatch Logs Insights for querying
- Lambda function correlation IDs for request tracing
- Structured logging (JSON format) for easy parsing

### 8.2 Monitoring Metrics

**CloudWatch Dashboards:**
- API Gateway request rate (requests per minute)
- API Gateway latency (p50, p95, p99)
- Lambda function invocations and errors
- Lambda duration and concurrent executions
- Lambda cold start frequency
- RDS CPU and memory utilization
- RDS connection count
- RDS read/write IOPS
- ElastiCache hit/miss ratio (if using)

**CloudWatch Alarms:**
- Lambda error rate > 1% → SNS notification (email + SMS)
- API Gateway 5xx errors > 5 in 5 minutes → SNS notification
- Lambda duration p95 > 3 seconds → SNS notification
- RDS CPU > 80% for 5 minutes → SNS notification
- RDS connection count > 80% of max → SNS notification
- RDS storage space < 20% free → SNS notification

### 8.3 Application Performance Monitoring (APM)

**AWS X-Ray Integration:**
- Distributed tracing across Lambda functions
- API Gateway to Lambda to RDS trace maps
- Database query performance tracking
- Identify bottlenecks and slow queries
- Service map visualization

**Additional Monitoring:**
- CloudWatch Synthetics for synthetic monitoring (uptime checks)
- CloudWatch RUM (Real User Monitoring) for frontend performance
- Core Web Vitals tracking (LCP, FID, CLS)

---

## 9. Deployment & DevOps

### 9.1 CI/CD Pipeline

**AWS CodePipeline Workflow:**

```yaml
# Using GitHub Actions as alternative (more common)
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Run unit tests (Jest)
      - Run integration tests
      - Run linting (ESLint, Prettier)
      - Run type checking (TypeScript)
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - Build Lambda deployment packages (zip files)
      - Build React app (frontend)
      - Upload Lambda packages to S3
      - Upload frontend build to S3
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - Update Lambda functions (via AWS CLI or SAM)
      - Deploy frontend to S3 + invalidate CloudFront cache
      - Run database migrations (Prisma Migrate via Lambda)
      - Run smoke tests
      - Notify team (Slack or SNS)
```

**AWS Native Pipeline (Alternative):**
- **Source:** GitHub or AWS CodeCommit
- **Build:** AWS CodeBuild (run tests, build packages)
- **Deploy:** AWS CodeDeploy or CloudFormation
- **Notifications:** AWS SNS for pipeline status

### 9.2 Environment Strategy

**Three Environments:**

1. **Development** (dev)
   - Branch: `develop`
   - Auto-deploy on push
   - Shared RDS database (dev instance - db.t3.micro)
   - Lambda with minimal memory (512 MB)
   - Test data only

2. **Staging** (staging)
   - Branch: `staging`
   - Manual deploy (approval required)
   - Separate RDS database (production-like - db.t3.small)
   - Lambda with production-like configuration (1024 MB)
   - Production-like configuration
   - Used for UAT (User Acceptance Testing)

3. **Production** (prod)
   - Branch: `main`
   - Manual deploy (approval required)
   - Separate RDS database (Multi-AZ - db.t3.medium)
   - Lambda with provisioned concurrency
   - High availability configuration
   - Automated backups and point-in-time recovery

### 9.3 Database Migration Strategy

**Prisma Migrate:**
```bash
# Generate migration
npx prisma migrate dev --name add_employee_role

# Apply migration to staging
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Apply migration to production (via Lambda or CodeBuild)
npx prisma migrate deploy
```

**Migration Lambda Function:**
- Dedicated Lambda function for running migrations
- Triggered manually via AWS Console or CLI
- Runs before application deployment
- Logs migration results to CloudWatch

**Rollback Strategy:**
- RDS automated backups (point-in-time recovery)
- Lambda version aliases (instant rollback to previous version)
- CloudFormation rollback on failure
- Manual SQL scripts for complex rollbacks

### 9.4 Infrastructure as Code

**AWS CloudFormation or Terraform:**

**Recommended: Terraform for flexibility and multi-cloud support**

**Terraform Modules:**
- `modules/network` - VPC, subnets, NAT Gateway, Internet Gateway
- `modules/rds` - PostgreSQL database with Multi-AZ
- `modules/lambda` - Lambda functions, IAM roles, layers
- `modules/api-gateway` - REST API, authorizers, stages
- `modules/cognito` - User pools, identity pools, app clients
- `modules/s3-cloudfront` - S3 buckets, CloudFront distributions
- `modules/monitoring` - CloudWatch alarms, dashboards, SNS topics

**Sample Terraform Structure:**
```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── prod/
├── modules/
│   ├── rds/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── lambda/
│   ├── api-gateway/
│   └── ...
└── README.md
```

**AWS SAM (Serverless Application Model) Alternative:**
- Simpler for Lambda-focused applications
- Built-in local testing (SAM CLI)
- Integrates with CloudFormation
- Good for pure serverless architectures

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Backend (Jest):**
- Test tip calculation algorithm
- Test support staff cap logic
- Test audit trail creation
- Test validation schemas (Zod)
- Target: 80% code coverage

**Frontend (Jest + React Testing Library):**
- Test form validation
- Test calculation display
- Test error handling
- Test routing and navigation
- Target: 70% code coverage

### 10.2 Integration Tests

**API Integration Tests (Supertest):**
- Test full API request/response cycle
- Test database interactions
- Test authentication/authorization
- Test multi-tenant isolation
- Use test database (separate from dev)

### 10.3 End-to-End Tests (E2E)

**Playwright or Cypress:**
- Test complete user workflows:
  - Manager login → Create tip entry → View results
  - Employee login via magic link → View tips
  - Admin configure shifts → Manager uses new shift
- Run on staging environment before production deploy

### 10.4 Load Testing

**Artillery or k6:**
- Simulate 100 concurrent users
- Test tip calculation with 50 employees
- Measure response times under load
- Identify bottlenecks

---

## 11. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Checkpoints:**
- [ ] Set up AWS account and configure billing alerts
- [ ] Set up Terraform or CloudFormation infrastructure code
- [ ] Create VPC with public and private subnets
- [ ] Deploy Amazon RDS PostgreSQL database (Multi-AZ for prod)
- [ ] Create database schema using Prisma
- [ ] Set up AWS Cognito User Pools for authentication
- [ ] Set up Git repository (GitHub/GitLab) + CI/CD pipeline
- [ ] Configure AWS CodePipeline or GitHub Actions
- [ ] Deploy "Hello World" Lambda function via API Gateway
- [ ] Deploy static React app to S3 + CloudFront
- [ ] Configure custom domain with Route 53 (optional)
- [ ] Set up CloudWatch dashboards and alarms

**Git Checkpoint:** `git tag v0.1.0-foundation`

### Phase 2: Core Backend (Weeks 3-4)
**Checkpoints:**
- [ ] Implement authentication endpoints
- [ ] Implement tenant management API
- [ ] Implement user management API
- [ ] Implement employee management API
- [ ] Implement shift configuration API
- [ ] Implement support staff config API
- [ ] Write unit tests for all APIs
- [ ] Write integration tests

**Git Checkpoint:** `git tag v0.2.0-backend-core`

### Phase 3: Tip Calculation Logic (Week 5)
**Checkpoints:**
- [ ] Implement tip calculation algorithm
- [ ] Implement tip entry creation API
- [ ] Implement tip calculation API
- [ ] Handle edge cases (cap enforcement)
- [ ] Write comprehensive unit tests for algorithm
- [ ] Test with sample data (multiple scenarios)
- [ ] Code review + optimization

**Git Checkpoint:** `git tag v0.3.0-tip-calculation`

### Phase 4: Frontend - Authentication & Layout (Week 6)
**Checkpoints:**
- [ ] Set up React app structure
- [ ] Implement authentication UI (login forms)
- [ ] Implement navigation layout
- [ ] Implement role-based routing
- [ ] Implement admin dashboard shell
- [ ] Implement manager dashboard shell
- [ ] Implement employee dashboard shell

**Git Checkpoint:** `git tag v0.4.0-frontend-auth`

### Phase 5: Frontend - Admin Features (Week 7)
**Checkpoints:**
- [ ] Implement employee management UI
- [ ] Implement shift configuration UI
- [ ] Implement support staff config UI
- [ ] Implement user management UI
- [ ] Form validation + error handling
- [ ] Responsive design (mobile-friendly)

**Git Checkpoint:** `git tag v0.5.0-frontend-admin`

### Phase 6: Frontend - Tip Entry (Week 8)
**Checkpoints:**
- [ ] Implement tip entry form UI
- [ ] Dynamic employee/shift selection
- [ ] Real-time calculation preview
- [ ] Results display (breakdown by employee)
- [ ] Form validation + error handling
- [ ] Mobile-responsive design

**Git Checkpoint:** `git tag v0.6.0-frontend-tip-entry`

### Phase 7: Data Management & History (Week 9)
**Checkpoints:**
- [ ] Implement tip entry edit functionality (backend)
- [ ] Implement soft delete + audit trail (backend)
- [ ] Implement historical entries view (frontend)
- [ ] Implement edit UI with confirmation
- [ ] Implement audit log viewer (admin only)
- [ ] Test edit/rollback scenarios

**Git Checkpoint:** `git tag v0.7.0-data-management`

### Phase 8: Employee Self-Service (Week 10)
**Checkpoints:**
- [ ] Implement magic link generation (backend)
- [ ] Implement email sending (SendGrid integration)
- [ ] Implement employee dashboard (frontend)
- [ ] Display 30-day tip history
- [ ] Display summary statistics
- [ ] Mobile-optimized UI

**Git Checkpoint:** `git tag v0.8.0-employee-portal`

### Phase 9: Reporting & Exports (Week 11)
**Checkpoints:**
- [ ] Implement CSV export (backend)
- [ ] Implement daily/weekly/monthly reports (backend)
- [ ] Implement report UI (frontend)
- [ ] Implement data visualization (charts)
- [ ] Test large exports (performance)

**Git Checkpoint:** `git tag v0.9.0-reporting`

### Phase 10: Testing & Polish (Week 12)
**Checkpoints:**
- [ ] Write E2E tests (critical user flows)
- [ ] Perform load testing
- [ ] Fix bugs found during testing
- [ ] Improve UI/UX based on feedback
- [ ] Security audit + penetration testing
- [ ] Performance optimization
- [ ] Documentation (user guides, API docs)

**Git Checkpoint:** `git tag v1.0.0-rc1` (Release Candidate)

### Phase 11: UAT & Production Deploy (Week 13)
**Checkpoints:**
- [ ] Deploy to staging environment
- [ ] Conduct user acceptance testing with pilot users
- [ ] Gather feedback + make adjustments
- [ ] Final security review
- [ ] Deploy to production
- [ ] Monitor for 48 hours
- [ ] Create incident response plan

**Git Checkpoint:** `git tag v1.0.0` (Production Release)

### Phase 12: Post-Launch Support (Ongoing)
**Checkpoints:**
- [ ] Monitor system performance
- [ ] Address user feedback
- [ ] Fix bugs promptly
- [ ] Plan Phase 2 features (email notifications, advanced reporting)

---

## 12. Cost Estimation (AWS)

### 12.1 Monthly Cost Breakdown (Single Tenant)

**Amazon RDS (PostgreSQL):**
- db.t3.micro instance (2 vCPU, 1 GB RAM): ~$15/month
- 20 GB GP3 storage: ~$2.50/month
- Automated backups (20 GB): ~$2/month
- Multi-AZ (optional for production): +$15/month
- **Subtotal:** $20-35/month (single-AZ: $20, Multi-AZ: $35)

**AWS Lambda:**
- Request volume: 10,000 requests/day = 300K/month
- Average duration: 200ms per request
- Memory: 512 MB
- Free tier: 1M requests + 400,000 GB-seconds free
- **Subtotal:** $0/month (within free tier for single tenant)
- Beyond free tier: ~$2-5/month

**Amazon API Gateway:**
- 300K requests/month
- Free tier: 1M requests/month (12 months)
- After free tier: $1.05 per million requests
- **Subtotal:** $0/month (within free tier), ~$0.32/month after

**Amazon S3:**
- Frontend hosting: 500 MB: ~$0.01/month
- CSV exports: 1 GB: ~$0.02/month
- Backups: 5 GB: ~$0.12/month
- Requests: ~$0.01/month
- **Subtotal:** $0.16/month

**Amazon CloudFront (CDN):**
- Data transfer out: 50 GB/month: ~$4.25/month
- HTTP/HTTPS requests: 1M requests: ~$0.10/month
- Free tier: 1 TB data transfer + 10M requests (12 months)
- **Subtotal:** $0/month (within free tier), ~$4.35/month after

**AWS Cognito:**
- MAU (Monthly Active Users): 50
- Free tier: 50,000 MAU
- **Subtotal:** $0/month

**Amazon SES (Email):**
- 1,000 emails/month
- Free tier: 62,000 emails/month (when sent from EC2 or Lambda)
- Outside free tier: $0.10 per 1,000 emails
- **Subtotal:** $0/month (within free tier)

**Amazon ElastiCache (Redis - Optional):**
- cache.t3.micro: ~$12/month
- **Subtotal:** $12/month (if used)

**Amazon CloudWatch:**
- Logs: 5 GB ingestion: ~$2.50/month
- Metrics: 10 custom metrics: ~$3/month
- Alarms: 10 alarms: ~$1/month
- Free tier includes: 10 custom metrics, 10 alarms, 5 GB logs
- **Subtotal:** $0-6/month

**AWS Secrets Manager:**
- 5 secrets: ~$2/month
- API calls: Included in free tier
- **Subtotal:** $2/month

**RDS Proxy (Optional):**
- 2 vCPUs: ~$15/month
- **Subtotal:** $15/month (if needed for connection pooling)

**Data Transfer:**
- Data out to internet: 10 GB/month: ~$0.90/month
- Inter-service transfers within same region: Free
- **Subtotal:** $1/month

---

**Total Estimated Cost per Tenant (First Year with Free Tier):**
- Minimum configuration: ~$25/month
- Recommended configuration: ~$35-45/month
- With all optimizations (Redis, RDS Proxy): ~$65/month

**Total Estimated Cost per Tenant (After Free Tier Expires):**
- Minimum configuration: ~$30/month
- Recommended configuration: ~$45-55/month
- Production-ready (Multi-AZ, Redis, RDS Proxy): ~$75-85/month

### 12.2 Scaling Cost (10 Tenants)

**Shared Resources (can serve multiple tenants):**
- RDS: Upgrade to db.t3.small ($30/month) or db.t3.medium ($60/month)
- ElastiCache: Upgrade to cache.t3.small ($25/month)
- **Subtotal:** $55-85/month

**Per-Request Costs (scales with usage):**
- Lambda: ~$15-25/month (3M requests)
- API Gateway: ~$3/month
- CloudFront: ~$40/month (500 GB data transfer)
- S3: ~$2/month
- SES: ~$1/month (if beyond free tier)
- **Subtotal:** $61-71/month

**Fixed Costs:**
- Cognito: $0 (within free tier)
- CloudWatch: ~$10/month
- Secrets Manager: ~$2/month
- **Subtotal:** $12/month

---

**Total Estimated Cost for 10 Tenants:** $130-170/month

**Per-Tenant Cost at Scale:** $13-17/month per tenant

### 12.3 Cost Optimization Strategies

**Immediate Optimizations:**
- Use AWS Free Tier for first 12 months (saves ~$50-100/month)
- Right-size RDS instances (start with db.t3.micro, scale up only when needed)
- Enable RDS storage autoscaling (pay only for what you use)
- Use S3 Intelligent-Tiering for backups (automatic cost optimization)
- Enable CloudFront caching with high TTL (reduce origin requests)

**Architectural Optimizations:**
- Use API Gateway caching for read-only endpoints (reduce Lambda invocations)
- Implement Lambda provisioned concurrency only for critical functions
- Use Lambda layers for shared dependencies (reduce deployment package size)
- Batch database writes where possible (reduce RDS load)
- Use RDS read replicas only when actually needed (don't over-provision)

**Long-term Optimizations:**
- Reserved Instances for RDS (save up to 40% with 1-year commitment)
- Savings Plans for Lambda (save up to 17% with commitment)
- S3 lifecycle policies (move old data to Glacier after 1 year, save 80%)
- CloudFront Reserved Capacity (save 30% with commitment)
- Spot Instances for non-critical batch jobs (save up to 90%)

**Monitoring & Alerts:**
- Set up AWS Budgets with alerts ($50, $100, $150 thresholds)
- Use AWS Cost Explorer to identify cost spikes
- Enable AWS Cost Anomaly Detection
- Review AWS Trusted Advisor recommendations monthly
- Tag all resources by environment and tenant for cost tracking

### 12.4 Cost Comparison: AWS vs Competitors

| Component | AWS | Google Cloud | Azure |
|-----------|-----|--------------|-------|
| Compute (Serverless) | Lambda ($0.20/1M) | Cloud Functions ($0.40/1M) | Azure Functions ($0.20/1M) |
| Database (small) | RDS t3.micro ($15) | Cloud SQL db-f1-micro ($25) | Azure DB Basic ($5) |
| Storage | S3 ($0.023/GB) | Cloud Storage ($0.020/GB) | Blob Storage ($0.018/GB) |
| CDN | CloudFront ($0.085/GB) | Cloud CDN ($0.080/GB) | Azure CDN ($0.087/GB) |
| **Total (estimated)** | **$35-55/month** | **$55-70/month** | **$30-50/month** |

**Winner: AWS offers the best balance of features, maturity, and cost for this application.**

---

## 13. Risk Mitigation

### 13.1 Technical Risks

| Risk | Mitigation |
|------|------------|
| Database performance degradation | Database indexing, query optimization, read replicas if needed |
| API rate limiting issues | Implement caching, optimize queries, horizontal scaling |
| Data loss | Automated backups every 6 hours, point-in-time recovery, multi-region replication (future) |
| Security breach | Regular security audits, penetration testing, least privilege access, encryption |
| Multi-tenant data leakage | Row-level security, middleware tenant validation, comprehensive testing |

### 13.2 Business Risks

| Risk | Mitigation |
|------|------------|
| Low user adoption | Intuitive UI, training materials, responsive support, pilot program |
| Calculation errors | Comprehensive unit tests, user acceptance testing, audit trail for corrections |
| Regulatory compliance | Legal review, FLSA compliance documentation, audit trail retention |
| Vendor lock-in (Google Cloud) | Use open standards (PostgreSQL, Docker), design for portability |

---

## 14. Future Enhancements Roadmap

### Phase 2 (Q1 2026)
- Email notifications to employees
- Advanced reporting and analytics
- Mobile app (iOS/Android)

### Phase 3 (Q2 2026)
- POS system integration (automatic tip import)
- Payroll system integration
- Multi-currency support

### Phase 4 (Q3 2026)
- Real-time tip tracking during shifts
- Employee scheduling integration
- Predictive analytics (tip forecasting)

### Phase 5 (Q4 2026)
- White-label solution for franchises
- API for third-party integrations
- Advanced access controls (custom roles)

---

## 15. Documentation Deliverables

### 15.1 Technical Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema documentation
- [ ] Architecture diagrams
- [ ] Deployment runbook
- [ ] Incident response playbook

### 15.2 User Documentation
- [ ] Admin user guide
- [ ] Manager user guide
- [ ] Employee user guide
- [ ] Video tutorials (screen recordings)
- [ ] FAQ document

### 15.3 Developer Documentation
- [ ] Contributing guidelines
- [ ] Code style guide
- [ ] Local development setup
- [ ] Testing guidelines
- [ ] Release process

---

## 16. Approval & Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Product Owner | | | |
| Security Officer | | | |
| DevOps Lead | | | |

---

**Document End**

*This Technical Design Document serves as the blueprint for implementing the Tip Pooling Management System. All implementation decisions should reference this document. Any deviations must be documented via formal change request process.*
