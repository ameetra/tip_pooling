declare namespace Express {
  interface Request {
    tenantId: string;
    user?: { employeeId: string; tenantId: string; role: string; email: string };
  }
}
