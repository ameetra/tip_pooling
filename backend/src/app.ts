import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { tenantContext } from './middleware/tenant-context';
import { verifyJWT, requireRole } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import employeeRoutes from './routes/employee.routes';
import supportConfigRoutes from './routes/support-config.routes';
import tipRoutes from './routes/tip.routes';
import auditRoutes from './routes/audit.routes';
import userRoutes from './routes/user.routes';
import { tipController } from './controllers/tip.controller';
import { employeeController } from './controllers/employee.controller';
import { validateBody } from './middleware/validate';
import { TipPreviewSchema, CreateTipEntrySchema } from './validation/tip.schema';

const FRONTEND_URL = process.env.APP_URL || 'https://usegratify.com';
// Allow the primary domain plus the legacy CloudFront URL (transition / fallback).
const ALLOWED_ORIGINS = [...new Set([FRONTEND_URL, 'https://usegratify.com', 'https://d3vrbd8qbym3pv.cloudfront.net'])];

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many login attempts. Try again in 15 minutes.' } },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // we intentionally configure trust proxy below
});

export function createApp() {
  const app = express();

  // Behind CloudFront + API Gateway: derive the client IP from X-Forwarded-For so rate
  // limiting and audit logs key on the real client, not a shared proxy address.
  app.set('trust proxy', true);

  app.use(helmet());
  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(tenantContext);

  // Health check (public)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public tenant branding — login pages + root venue picker (no auth)
  app.use('/api/v1/tenants', tenantRoutes);

  // Auth routes — login has rate limiting
  app.use('/api/v1/auth/login', loginLimiter);
  app.use('/api/v1/auth', authRoutes);

  // Employee tip history — any authenticated user can read their own
  app.get('/api/v1/tips/my-history', verifyJWT, tipController.myHistory);

  // Shift-lead-accessible routes: tip entry creation + read-only employee lookup
  // for the form's dropdown. Registered before the broad mounts so these
  // specific paths bypass the adminOrManager gate.
  const tipCreator = [verifyJWT, requireRole('ADMIN', 'MANAGER', 'SHIFT_LEAD')];
  app.post('/api/v1/tips/preview', ...tipCreator, validateBody(TipPreviewSchema), tipController.preview);
  app.post('/api/v1/tips/entries', ...tipCreator, validateBody(CreateTipEntrySchema), tipController.create);
  app.get('/api/v1/employees', ...tipCreator, employeeController.findAll);

  // Protected routes — require Admin or Manager role
  const adminOrManager = [verifyJWT, requireRole('ADMIN', 'MANAGER')];
  app.use('/api/v1/employees', ...adminOrManager, employeeRoutes);
  app.use('/api/v1/config/support-staff', ...adminOrManager, supportConfigRoutes);
  app.use('/api/v1/tips', ...adminOrManager, tipRoutes);
  app.use('/api/v1/audit', ...adminOrManager, auditRoutes);

  // Staff management — ADMIN + MANAGER (controller enforces target-role rules)
  app.use('/api/v1/users', verifyJWT, requireRole('ADMIN', 'MANAGER'), userRoutes);

  app.use(errorHandler);

  return app;
}
