import express from 'express';
import { tenantContext } from './middleware/tenant-context';
import { errorHandler } from './middleware/error-handler';
import employeeRoutes from './routes/employee.routes';
import shiftRoutes from './routes/shift.routes';
import supportConfigRoutes from './routes/support-config.routes';
import tipRoutes from './routes/tip.routes';
import auditRoutes from './routes/audit.routes';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(tenantContext);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/v1/employees', employeeRoutes);
  app.use('/api/v1/shifts', shiftRoutes);
  app.use('/api/v1/config/support-staff', supportConfigRoutes);
  app.use('/api/v1/tips', tipRoutes);
  app.use('/api/v1/audit', auditRoutes);

  app.use(errorHandler);

  return app;
}
