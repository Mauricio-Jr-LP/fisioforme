import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import { env } from '../config/env.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

export const TZ = env.clinicTz;

/** Constrói um Dayjs no fuso da clínica a partir de 'YYYY-MM-DD' + 'HH:mm'. */
export function clinicDateTime(date: string, time: string) {
  return dayjs.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', TZ);
}

/** Dia da semana (0=domingo) de uma data no fuso da clínica. */
export function weekdayOf(date: string): number {
  return dayjs.tz(date, 'YYYY-MM-DD', TZ).day();
}

export { dayjs };
