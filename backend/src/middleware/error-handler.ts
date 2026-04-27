import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { TipCalculationError } from '../services/tip-calculation.service';
import { ApiErrorResponse } from '../types/api.types';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const response: ApiErrorResponse = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  };

  if (err instanceof ZodError) {
    response.error = {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    };
    res.status(400).json(response);
    return;
  }

  if (err instanceof TipCalculationError) {
    response.error = { code: err.code, message: err.message };
    res.status(400).json(response);
    return;
  }

  // Auth errors
  if ((err as any).code === 'INVALID_CREDENTIALS') {
    response.error = { code: 'INVALID_CREDENTIALS', message: err.message };
    res.status(401).json(response);
    return;
  }

  // Prisma unique constraint violation
  if (err.constructor?.name === 'PrismaClientKnownRequestError' && (err as any).code === 'P2002') {
    response.error = { code: 'DUPLICATE_ENTRY', message: 'A record with this value already exists' };
    res.status(409).json(response);
    return;
  }

  console.error('Unhandled error:', { message: err.message, stack: err.stack?.split('\n').slice(0, 3).join(' | ') });
  res.status(500).json(response);
}
