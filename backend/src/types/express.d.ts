declare namespace Express {
  interface Request {
    tenantId: string;
    user?: { sub: string; tenantId: string; role: string; email: string };
  }
}
