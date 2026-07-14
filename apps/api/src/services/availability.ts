import type { TimeSlot } from '@fisioforme/shared';
import { query, queryOne } from '../db/pool.js';
import { clinicDateTime, weekdayOf, dayjs, TZ } from '../lib/time.js';

interface Window {
  start: number; // unix ms
  end: number;
}

async function slotGranularity(): Promise<number> {
  const row = await queryOne<{ value: any }>(
    "select value from clinic_settings where key = 'clinic'",
    []
  );
  const g = row?.value?.slot_granularity_minutes;
  return typeof g === 'number' && g > 0 ? g : 30;
}

/**
 * Calcula os horários livres para uma data e duração de serviço.
 * Considera regras semanais, exceções (bloqueios/extras) e agendamentos ocupados.
 */
export async function computeSlots(
  date: string,
  durationMinutes: number
): Promise<TimeSlot[]> {
  const weekday = weekdayOf(date);
  const granularity = await slotGranularity();

  // 1) Janelas base da regra semanal
  const rules = await query<{ start_time: string; end_time: string }>(
    'select start_time, end_time from availability_rules where weekday = $1 and active = true order by start_time',
    [weekday]
  );
  let windows: Window[] = rules.map((r) => ({
    start: clinicDateTime(date, r.start_time.slice(0, 5)).valueOf(),
    end: clinicDateTime(date, r.end_time.slice(0, 5)).valueOf(),
  }));

  // 2) Exceções do dia
  const exceptions = await query<{
    is_available: boolean;
    start_time: string | null;
    end_time: string | null;
  }>(
    'select is_available, start_time, end_time from availability_exceptions where date = $1',
    [date]
  );

  for (const ex of exceptions) {
    if (!ex.is_available) {
      if (!ex.start_time || !ex.end_time) {
        // Bloqueio do dia inteiro
        windows = [];
      } else {
        // Bloqueio de sub-janela → subtrai
        const bStart = clinicDateTime(date, ex.start_time.slice(0, 5)).valueOf();
        const bEnd = clinicDateTime(date, ex.end_time.slice(0, 5)).valueOf();
        windows = subtract(windows, { start: bStart, end: bEnd });
      }
    } else if (ex.start_time && ex.end_time) {
      // Disponibilidade extra
      windows.push({
        start: clinicDateTime(date, ex.start_time.slice(0, 5)).valueOf(),
        end: clinicDateTime(date, ex.end_time.slice(0, 5)).valueOf(),
      });
    }
  }

  if (windows.length === 0) return [];

  // 3) Agendamentos ocupados (não cancelados) que tocam o dia
  const dayStart = clinicDateTime(date, '00:00').valueOf();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const busyRows = await query<{ start_time: string; end_time: string }>(
    `select start_time, end_time from appointments
       where status <> 'cancelled'
         and start_time < to_timestamp($1 / 1000.0)
         and end_time > to_timestamp($2 / 1000.0)`,
    [dayEnd, dayStart]
  );
  const busy: Window[] = busyRows.map((b) => ({
    start: new Date(b.start_time).getTime(),
    end: new Date(b.end_time).getTime(),
  }));

  // 4) Gera candidatos
  const durationMs = durationMinutes * 60 * 1000;
  const stepMs = granularity * 60 * 1000;
  const now = Date.now();
  const slots: TimeSlot[] = [];

  const ordered = [...windows].sort((a, b) => a.start - b.start);
  for (const w of ordered) {
    for (let t = w.start; t + durationMs <= w.end; t += stepMs) {
      const slotEnd = t + durationMs;
      if (t < now) continue; // não oferecer horários passados
      const overlaps = busy.some((b) => t < b.end && slotEnd > b.start);
      if (overlaps) continue;
      slots.push({
        start: new Date(t).toISOString(),
        end: new Date(slotEnd).toISOString(),
        label: dayjs(t).tz(TZ).format('HH:mm'),
      });
    }
  }

  return slots;
}

/** Subtrai um intervalo `cut` de uma lista de janelas. */
function subtract(windows: Window[], cut: Window): Window[] {
  const out: Window[] = [];
  for (const w of windows) {
    if (cut.end <= w.start || cut.start >= w.end) {
      out.push(w); // sem interseção
      continue;
    }
    if (cut.start > w.start) out.push({ start: w.start, end: cut.start });
    if (cut.end < w.end) out.push({ start: cut.end, end: w.end });
  }
  return out;
}

/** Verifica se um intervalo específico está livre (para confirmar reserva). */
export async function isSlotFree(startIso: string, durationMinutes: number): Promise<boolean> {
  const start = new Date(startIso).getTime();
  const end = start + durationMinutes * 60 * 1000;
  const conflicts = await query(
    `select 1 from appointments
       where status <> 'cancelled'
         and start_time < to_timestamp($1 / 1000.0)
         and end_time > to_timestamp($2 / 1000.0)
       limit 1`,
    [end, start]
  );
  return conflicts.length === 0;
}
