import { DAYS } from '../config.js';
import { commit, getLastActiveDate, getState, setLastActiveDate } from '../state/store.js';
import { consideredGroups, getItemText, getProgress, getSteps } from '../state/selectors.js';
import { getLocalISODate } from '../utils/date.js';

const MODES = ['completo', 'minimo'];

function isISODate(value){
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

function modeHasProgress(state, dayName, mode){
  return consideredGroups(state, dayName, mode).some(g =>
    g.items.some(item => getProgress(item, mode) > 0)
  );
}

function archiveMode(state, dayName, day, date, mode){
  if(day.log.some(entry => entry.date === date && entry.mode === mode)) return false;

  const items = [];
  consideredGroups(state, dayName, mode).forEach(g => {
    g.items.forEach(item => {
      items.push({
        text: getItemText(item, mode),
        done: getProgress(item, mode) >= getSteps(item, mode),
        group: g.name
      });
    });
  });

  const allDone = items.length > 0 && items.every(item => item.done);
  day.log.push({
    date,
    mode,
    items,
    status: allDone ? (mode === 'completo' ? 'full' : 'min') : 'partial'
  });
  return true;
}

function clearDayProgress(day){
  let cleared = false;
  day.groups.forEach(g => g.items.forEach(item => {
    if(!item.progress || typeof item.progress !== 'object') return;
    if(item.progress.completo > 0 || item.progress.minimo > 0) cleared = true;
    item.progress.completo = 0;
    item.progress.minimo = 0;
  }));
  return cleared;
}

/**
 * Detecta un cambio de fecha y archiva el progreso anterior una sola vez.
 * Se llama al cargar y al volver a la app; no usa temporizadores de medianoche.
 */
export function rolloverDay(now = new Date()){
  const today = getLocalISODate(now);
  const previous = getLastActiveDate();

  if(!isISODate(previous)){
    setLastActiveDate(today);
    return { changed: false, archived: 0, from: null, to: today, reason: 'initialized' };
  }

  if(previous === today){
    return { changed: false, archived: 0, from: previous, to: today, reason: 'same-day' };
  }

  const state = getState();
  let archived = 0;
  let cleared = false;

  DAYS.forEach(dayName => {
    const day = state[dayName];
    MODES.forEach(mode => {
      if(modeHasProgress(state, dayName, mode) && archiveMode(state, dayName, day, previous, mode)){
        archived++;
      }
    });
    if(clearDayProgress(day)) cleared = true;
  });

  setLastActiveDate(today);
  if(cleared) commit();

  return { changed: true, archived, from: previous, to: today, reason: 'new-day' };
}
