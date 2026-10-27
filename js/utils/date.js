export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const WEEKDAY_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export function getLocalISODate(d = new Date()){
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Convierte 'YYYY-MM-DD' en una fecha local.
 * Evita que new Date('YYYY-MM-DD') la interprete como UTC y muestre el día anterior.
 */
export function parseLocalISODate(str){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
  if(!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(year, month - 1, day, 12);

  if(
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;

  return date;
}

export function isISODate(value){
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Boolean(parseLocalISODate(value));
}

export function getDayIndex(date = new Date()){
  return (date.getDay() + 6) % 7;
}

export function getDayName(date = new Date()){
  return WEEKDAY_SHORT[getDayIndex(date)];
}

export function getDayNameFromISODate(iso){
  const date = parseLocalISODate(iso);
  return date ? getDayName(date) : '';
}

export function addDays(date, delta){
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + delta);
  return copy;
}

export function addDaysISO(iso, delta){
  const date = parseLocalISODate(iso);
  if(!date) return '';
  return getLocalISODate(addDays(date, delta));
}

export function startOfWeek(date = new Date()){
  const source = typeof date === 'string' ? parseLocalISODate(date) : date;
  const d = new Date((source || new Date()).getTime());
  d.setHours(12, 0, 0, 0);
  return addDays(d, -getDayIndex(d));
}

export function getWeekStartISO(date = new Date()){
  return getLocalISODate(startOfWeek(date));
}

export function getWeekDates(date = new Date()){
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => getLocalISODate(addDays(start, i)));
}

export function getMonthKey(iso){
  const date = parseLocalISODate(iso);
  if(!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key){
  const [year, month] = String(key || '').split('-').map(Number);
  if(!year || !month || month < 1 || month > 12) return String(key || '');
  const name = MONTH_NAMES[month - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

function capitalize(text){
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';
}

export function formatDateLong(iso){
  const date = parseLocalISODate(iso);
  if(!date) return iso || '';
  return capitalize(`${WEEKDAY_LONG[getDayIndex(date)]} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`);
}

export function formatDateShort(iso){
  const date = parseLocalISODate(iso);
  if(!date) return iso || '';
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

export function formatWeekRange(startISO){
  const dates = getWeekDates(startISO);
  const start = parseLocalISODate(dates[0]);
  const end = parseLocalISODate(dates[6]);
  if(!start || !end) return '';

  if(start.getFullYear() !== end.getFullYear()){
    return `Semana del ${start.getDate()} de ${MONTH_NAMES[start.getMonth()]} de ${start.getFullYear()} al ${end.getDate()} de ${MONTH_NAMES[end.getMonth()]} de ${end.getFullYear()}`;
  }
  if(start.getMonth() !== end.getMonth()){
    return `Semana del ${start.getDate()} de ${MONTH_NAMES[start.getMonth()]} al ${end.getDate()} de ${MONTH_NAMES[end.getMonth()]}`;
  }
  return `Semana del ${start.getDate()} al ${end.getDate()} de ${MONTH_NAMES[end.getMonth()]}`;
}

export function weeksBetween(startISO, endISO){
  const start = parseLocalISODate(startISO);
  const end = parseLocalISODate(endISO);
  if(!start || !end) return 0;
  return Math.round((end - start) / (7 * 24 * 60 * 60 * 1000));
}
