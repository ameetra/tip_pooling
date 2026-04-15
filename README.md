# Tip Pooling Management System

A cloud-native, multi-tenant SaaS application for restaurants to automate tip calculation and distribution. Servers' tips are pooled and prorated by hours worked, with configurable support staff percentages.

## Live Demo

**URL:** https://d3vrbd8qbym3pv.cloudfront.net

## Features

- **Tip Pooling** — Pool daily tips across all shifts, prorate to servers by hours worked
- **Support Staff** — Configurable percentage-based tip sharing (bussers, expeditors)
- **Employee Management** — Track hourly rates with forward-only rate history
- **Shift Management** — Define shifts with per-shift employee limits
- **Calculation Preview** — Preview tip distribution before saving
- **Audit Trail** — Full history of all changes for compliance
- **Multi-Tenant** — Isolated data per restaurant tenant

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

### Database Migration (first deploy)

```bash
# Create tables (runs inside Lambda/VPC to reach private RDS)
aws lambda invoke --function-name tip-pooling-dev-api --profile tip-pooling \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"migrate"}' /tmp/out.json

# Seed default tenant
aws lambda invoke --function-name tip-pooling-dev-api --profile tip-pooling \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"seed"}' /tmp/out.json
```

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
