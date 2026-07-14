import { Router } from 'express';
import { queryOne } from '../db/pool.js';
import { asyncHandler } from '../lib/http.js';

export const dbHealthRouter = Router();
dbHealthRouter.get('/', asyncHandler(async (req, res) => {
  const t = await queryOne('select 1 as ok');
  res.json(t);
}));
