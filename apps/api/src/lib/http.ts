import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';

/** Erro de aplicação com status HTTP. */
export class AppError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (msg = 'Não encontrado') => new AppError(404, msg);
export const badRequest = (msg = 'Requisição inválida', details?: unknown) =>
  new AppError(400, msg, details);
export const unauthorized = (msg = 'Não autenticado') => new AppError(401, msg);
export const forbidden = (msg = 'Acesso negado') => new AppError(403, msg);

/** Envolve handlers async para encaminhar erros ao errorHandler. */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    console.error('[api] Zod Error:', JSON.stringify(err.flatten()));
    return res.status(400).json({ error: 'Validação falhou', details: err.flatten() });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  console.error('[api] erro não tratado', err);
  const message = err instanceof Error ? err.message : 'Erro interno';
  return res.status(500).json({ error: message });
}
