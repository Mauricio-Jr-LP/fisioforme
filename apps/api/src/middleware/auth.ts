import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@fisioforme/shared';
import { supabaseAdmin } from '../lib/supabase.js';
import { queryOne } from '../db/pool.js';
import { unauthorized, forbidden } from '../lib/http.js';

export interface AuthUser {
  id: string;
  email: string | null;
  role: UserRole;
  full_name: string;
  patient_id: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Extrai e valida o Bearer token; popula req.user. Não bloqueia se ausente. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    const token = header.slice(7);

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return next();

    const profile = await queryOne<{ role: UserRole; full_name: string }>(
      'select role, full_name from profiles where id = $1',
      [data.user.id]
    );
    const patient = await queryOne<{ id: string }>(
      'select id from patients where profile_id = $1 limit 1',
      [data.user.id]
    );

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
      role: profile?.role ?? 'patient',
      full_name: profile?.full_name ?? '',
      patient_id: patient?.id ?? null,
    };
  } catch (e) {
    console.warn('[auth] falha ao validar token', e);
  }
  next();
}

/** Exige usuário autenticado. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw unauthorized();
  next();
}

/** Exige papel admin ou therapist. */
export function requireStaff(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw unauthorized();
  if (req.user.role !== 'admin' && req.user.role !== 'subadmin' && req.user.role !== 'therapist') throw forbidden();
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw unauthorized();
  if (req.user.role !== 'admin') throw forbidden();
  next();
}
