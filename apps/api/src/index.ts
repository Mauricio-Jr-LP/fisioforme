import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './lib/http.js';
import { attachUser } from './middleware/auth.js';

import { authRouter } from './routes/auth.js';
import { patientsRouter } from './routes/patients.js';
import { serviceTypesRouter } from './routes/serviceTypes.js';
import { availabilityRouter } from './routes/availability.js';
import { appointmentsRouter, publicBookingRouter } from './routes/appointments.js';
import { treatmentsRouter } from './routes/treatments.js';
import { consultationsRouter } from './routes/consultations.js';
import { attachmentsRouter } from './routes/attachments.js';
import { dashboardRouter } from './routes/dashboard.js';
import { portalRouter } from './routes/portal.js';
import { settingsRouter } from './routes/settings.js';

const app = express();

// CORS — permite o front (e requisições sem origin, ex.: curl/health)
const allowed = env.webOrigin.split(',').map((s) => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin) || env.nodeEnv !== 'production') return cb(null, true);
    cb(null, allowed.includes(origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// Popula req.user a partir do Bearer token (não bloqueia)
app.use(attachUser);

app.get('/health', (_req, res) => res.json({ ok: true }));
import { dbHealthRouter } from './routes/dbHealth.js';
app.use('/api/db-health', dbHealthRouter);

// Rotas
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/service-types', serviceTypesRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/public/bookings', publicBookingRouter);
app.use('/api/treatments', treatmentsRouter);
app.use('/api/consultations', consultationsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/portal', portalRouter);
app.use('/api/settings', settingsRouter);

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🩺 FisioForme API rodando em http://localhost:${env.port} (${env.nodeEnv})`);
});

