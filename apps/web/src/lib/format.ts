import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('pt-br');
dayjs.extend(relativeTime);

export const fmtDate = (d?: string | null) => (d ? dayjs(d).format('DD/MM/YYYY') : '—');
export const fmtDateTime = (d?: string | null) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—');
export const fmtTime = (d?: string | null) => (d ? dayjs(d).format('HH:mm') : '—');
export const fmtWeekday = (d?: string | null) => (d ? dayjs(d).format('ddd, DD/MM') : '—');
export const fromNow = (d?: string | null) => (d ? dayjs(d).fromNow() : '');

export const fmtMoney = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ageFrom(birth?: string | null): string {
  if (!birth) return '';
  const years = dayjs().diff(dayjs(birth), 'year');
  return `${years} anos`;
}

export { dayjs };
