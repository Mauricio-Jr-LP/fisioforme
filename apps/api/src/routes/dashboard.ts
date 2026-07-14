import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncHandler } from '../lib/http.js';
import { requireStaff } from '../middleware/auth.js';
import { computeSlots } from '../services/availability.js';
import { dayjs, TZ } from '../lib/time.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireStaff);

dashboardRouter.get('/', asyncHandler(async (_req, res) => {
  const todayStart = dayjs().tz(TZ).startOf('day').toISOString();
  const todayEnd = dayjs().tz(TZ).endOf('day').toISOString();
  const weekEnd = dayjs().tz(TZ).add(7, 'day').endOf('day').toISOString();

  const [patients, apptToday, apptWeek, activeTreatments, pending, upcoming] = await Promise.all([
    query<{ n: string }>('select count(*)::int as n from patients where active = true'),
    query<{ n: string }>('select count(*)::int as n from appointments where start_time between $1 and $2 and status <> $3', [todayStart, todayEnd, 'cancelled']),
    query<{ n: string }>('select count(*)::int as n from appointments where start_time between $1 and $2 and status <> $3', [todayStart, weekEnd, 'cancelled']),
    query<{ n: string }>("select count(*)::int as n from treatments where status = 'active'"),
    query<{ n: string }>("select count(*)::int as n from appointments where status = 'pending'"),
    query(`select a.*, json_build_object('id', p.id, 'full_name', p.full_name, 'phone', p.phone) as patient,
                   json_build_object('id', s.id, 'name', s.name, 'color', s.color) as service_type
              from appointments a
              left join patients p on p.id = a.patient_id
              left join service_types s on s.id = a.service_type_id
             where a.start_time >= $1 and a.status <> 'cancelled'
             order by a.start_time asc limit 8`, [todayStart]),
  ]);

  // próximos horários livres (hoje / próximos dias) usando serviço padrão 60min
  const nextAvailable = [] as any[];
  for (let i = 0; i < 5 && nextAvailable.length < 6; i++) {
    const date = dayjs().tz(TZ).add(i, 'day').format('YYYY-MM-DD');
    const slots = await computeSlots(date, 60);
    for (const s of slots.slice(0, 3)) {
      nextAvailable.push({ ...s, label: `${dayjs(s.start).tz(TZ).format('DD/MM')} ${s.label}` });
      if (nextAvailable.length >= 6) break;
    }
  }

  res.json({
    patients_total: (patients[0] as any)?.n ?? 0,
    appointments_today: (apptToday[0] as any)?.n ?? 0,
    appointments_week: (apptWeek[0] as any)?.n ?? 0,
    active_treatments: (activeTreatments[0] as any)?.n ?? 0,
    pending_appointments: (pending[0] as any)?.n ?? 0,
    upcoming,
    next_available: nextAvailable,
  });
}));
