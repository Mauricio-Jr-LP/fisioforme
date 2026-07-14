import { Router } from 'express';
import { asyncHandler, unauthorized } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

// GET /auth/me — perfil do usuário logado
authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) throw unauthorized();
  res.json(req.user);
}));
