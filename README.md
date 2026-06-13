# Gratify — Tip Pooling Management System

**Gratify** is a cloud-native, multi-tenant SaaS for restaurants and cafés to automate tip calculation
and distribution. Servers' tips are pooled and prorated by hours worked, with configurable support-staff
percentages. Each establishment runs as an isolated tenant under its own URL path.

## Live

**Platform:** https://usegratify.com — each venue lives at `usegratify.com/<slug>`.
Management sign-in at `/<slug>/manager-login`; employees use a magic-link at `/<slug>/login`.

> Operator docs: see **SUPER_ADMIN_GUIDE.md** (running the platform) and **RUNBOOK_ADD_TENANT.md**
> (adding a new venue). Credentials live in `CREDENTIALS.local.md` (gitignored).

## Features

- **Multi-tenant venues** — fully isolated data per establishment; path-based routing; per-venue logo + name
- **Tip Pooling** — pool daily tips across all shifts, prorate to servers by hours worked
- **Support Staff** — configurable percentage-based tip sharing (bussers, expeditors)
- **Authentication** — password sign-in (admin/manager/shift-lead) + passwordless magic link (employees)
- **Roles** — ADMIN, MANAGER, SHIFT_LEAD, and employees; admin-driven password reset with forced change
- **Employee Management** — track hourly rates with forward-only rate history
- **Shift Management** — define shifts; assign employees per shift
- **Calculation Preview** — preview tip distribution before saving
- **Tip Notifications** — publish a day's entry to email each employee their summary (per-venue branded)
- **Audit Trail** — full history of all changes for compliance

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Frontend       | React 19, MUI v9, React Router, Axios   |
| Backend        | Node.js, Express 5, TypeScript, Zod     |
| Database       | PostgreSQL 15 (RDS) / SQLite (local)    |
| ORM            | Prisma v7 with driver adapters          |
| Infrastructure | AWS Lambda, API Gateway, S3, CloudFront |
| IaC            | Terraform (6 modules, 50 resources)     |

## Project Structure

```
├── backend/
│   ├── prisma/              # Prisma schemas (SQLite + PostgreSQL)
│   ├── scripts/             # Build, deploy, and DB setup scripts
│   └── src/
│       ├── routes/          # Express route handlers
│       ├── services/        # Business logic
│       ├── middleware/       # Tenant context, error handling
│       ├── database/        # Prisma client, seeds
│       ├── lambda.ts        # Lambda entry point (serverless-http)
│       └── migrate.ts       # Lambda-based DB migration handler
├── frontend/
│   ├── scripts/             # S3/CloudFront deploy script
│   └── src/
│       ├── api/             # Axios API client
│       ├── components/      # Reusable UI components
│       └── pages/           # Route pages
└── terraform/               # AWS infrastructure (VPC, RDS, Lambda, etc.)
```

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev            # http://localhost:3000

# Frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### Testing

```bash
cd backend
npm test               # 74 tests (SQLite)
npm run test:coverage
```

## Deployment

### Backend (Lambda)

```bash
cd backend
bash scripts/setup-db.sh        # Configure RDS credentials + Lambda env vars
bash scripts/deploy-lambda.sh   # Build, package, and deploy to Lambda
```

### Frontend (S3/CloudFront)

```bash
cd frontend
bash scripts/deploy.sh           # Build, sync to S3, invalidate CloudFront
```

### Database migration & tenant provisioning (admin Lambda actions)

Admin actions run inside the Lambda/VPC to reach the private RDS and are gated by a secret
(`LAMBDA_ADMIN_SECRET` in the Lambda env). Pass `{"action":"...","secret":"<secret>"}`:

- `migrate` — apply additive schema migrations
- `seed` — seed the demo tenant
- `provision` — create a venue + its admin(s): `{"action":"provision","secret":"…","venues":[{"slug","name","logoUrl","admins":[{"email","password"}]}]}`

See **RUNBOOK_ADD_TENANT.md** for the full add-a-venue procedure and test checklist.

## API Endpoints

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/health`                         | Health check             |
| GET    | `/api/v1/employees`               | List employees           |
| POST   | `/api/v1/employees`               | Create employee          |
| PATCH  | `/api/v1/employees/:id`           | Update employee          |
| POST   | `/api/v1/employees/:id/rate`      | Update hourly rate       |
| GET    | `/api/v1/shifts`                  | List shifts              |
| POST   | `/api/v1/shifts`                  | Create shift             |
| GET    | `/api/v1/config/support-staff`    | List support staff config|
| POST   | `/api/v1/config/support-staff`    | Set support percentage   |
| GET    | `/api/v1/tips/entries`            | List tip entries         |
| POST   | `/api/v1/tips/entries`            | Create tip entry         |
| GET    | `/api/v1/tips/entries/:id`        | Get entry with calcs     |
| POST   | `/api/v1/tips/preview`            | Preview tip distribution |
| GET    | `/api/v1/audit/:entityType/:id`   | View audit history       |

## Tip Calculation Algorithm

1. Pool all tips for the day (cash tips + electronic tips)
2. Prorate to servers based on total hours worked
3. Support staff receives configured percentage from servers on shared shifts
4. Cap: support staff cannot earn more than the highest-earning server on their shift
5. Rounding remainder goes to the highest earner
