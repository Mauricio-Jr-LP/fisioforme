import { Router } from 'express';
import { asyncHandler, unauthorized, badRequest } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/pool.js';

export const authRouter = Router();

// GET /auth/me — perfil do usuário logado
authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) throw unauthorized();
  res.json(req.user);
}));

// PUT /auth/me — atualiza dados do perfil
authRouter.put('/me', requireAuth, asyncHandler(async (req, res) => {
  const { full_name } = req.body;
  if (!full_name) throw badRequest('Nome é obrigatório');
  await query('update profiles set full_name = $1 where id = $2', [full_name, req.user!.id]);
  res.json({ success: true });
}));
