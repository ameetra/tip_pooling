import express from 'express';
import { tenantContext } from './middleware/tenant-context';
import { verifyJWT } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import shiftRoutes from './routes/shift.routes';
import supportConfigRoutes from './routes/support-config.routes';
import tipRoutes from './routes/tip.routes';
import auditRoutes from './routes/audit.routes';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(tenantContext); // sets req.tenantId fallback (overridden by verifyJWT in prod)

  // Health check (public)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes (public — no JWT required)
  app.use('/api/v1/auth', authRoutes);

  // Protected routes — verifyJWT sets req.tenantId + req.user from JWT in prod
  app.use('/api/v1/employees', verifyJWT, employeeRoutes);
  app.use('/api/v1/shifts', verifyJWT, shiftRoutes);
  app.use('/api/v1/config/support-staff', verifyJWT, supportConfigRoutes);
  app.use('/api/v1/tips', verifyJWT, tipRoutes);
  app.use('/api/v1/audit', verifyJWT, auditRoutes);

  app.use(errorHandler);

  return app;
}
