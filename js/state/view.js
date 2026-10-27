import { getDayName, getLocalISODate } from '../utils/date.js';

const initialToday = getLocalISODate();

export const view = {
  screen: 'today',
  todayDate: initialToday,
  selectedDate: initialToday,
  editorDay: getDayName(),
  historySelectedDate: '',
  historyEditDate: '',
  historyVisibleWeeks: 8,
  draftModes: {}
};

/**
 * Sincroniza la fecha de la app cuando el día cambia con la app abierta.
 * No archiva nada: las sesiones ya viven en su propia fecha.
 */
export function syncToday(now = new Date()){
  const today = getLocalISODate(now);
  if(today === view.todayDate) return false;

  view.todayDate = today;
  if(view.screen === 'today') view.selectedDate = today;
  view.historyEditDate = '';
  view.draftModes = {};
  return true;
}
