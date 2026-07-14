import { Router } from 'express';
import { pool } from '../db/pool.js';

export const dbErrorRouter = Router();
dbErrorRouter.get('/', async (req, res) => {
  try {
    const r = await pool.query('select 1 as ok');
    res.json(r.rows);
  } catch (e) {
    res.json({ error: e.message, code: e.code, stack: e.stack });
  }
});
