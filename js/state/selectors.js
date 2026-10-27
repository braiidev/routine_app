import { addDaysISO, getLocalISODate, isISODate } from '../utils/date.js';

export function hasMinOverride(item){
  return item.minName != null || item.minSteps != null;
}

export function getSteps(item, mode){
  if(mode === 'minimo' && item.minSteps != null) return item.minSteps;
  return item.steps;
}

export function getItemText(item, mode){
  if(mode === 'minimo' && item.minName != null && item.minName !== '') return item.minName;
  return item.name;
}

export function consideredTemplateGroups(day, mode){
  if(!day) return [];
  return mode === 'minimo' ? day.groups.filter(g => !g.optional) : day.groups;
}

export function getTemplateDay(state, dayName){
  return state?.template?.[dayName] || null;
}

export function getSession(state, date){
  return state?.sessions?.[date] || null;
}

export function sessionHasProgress(session){
  if(!session || !Array.isArray(session.groups)) return false;
  return session.groups.some(g => (Array.isArray(g.items) ? g.items : []).some(it => {
    const done = it.done || 0;
    const steps = it.steps || 0;
    if(steps > 0) return done >= steps || done > 0;
    return done > 0;
  }));
}

export function sessionProgress(session){
  const groups = Array.isArray(session?.groups) ? session.groups : [];
  const items = groups.flatMap(g => Array.isArray(g.items) ? g.items : []);
  const done = items.reduce((n, it) => n + Math.min(it.done || 0, it.steps || 0), 0);
  const total = items.reduce((n, it) => n + (it.steps || 0), 0);
  const itemsDone = items.filter(it => (it.steps || 0) > 0 && (it.done || 0) >= it.steps).length;
  return { done, total, items: items.length, itemsDone };
}

export function sessionStatus(session){
  if(!session || !Array.isArray(session.groups)) return 'empty';
  const items = session.groups.flatMap(g => Array.isArray(g.items) ? g.items : []);
  if(items.length === 0) return 'empty';
  if(!sessionHasProgress(session)) return 'empty';
  const allDone = items.every(it => {
    const steps = it.steps || 0;
    const done = it.done || 0;
    return steps > 0 ? done >= steps : done > 0;
  });
  if(!allDone) return 'partial';
  return session.mode === 'minimo' ? 'min' : 'full';
}

export function sessionStatusForMigration(session){
  if(!session || !Array.isArray(session.groups)) return 'partial';
  const items = session.groups.flatMap(g => Array.isArray(g.items) ? g.items : []);
  if(items.length === 0) return 'partial';
  const done = items.filter(it => (it.done || 0) >= (it.steps || 0)).length;
  if(done !== items.length) return 'partial';
  return session.mode === 'minimo' ? 'min' : 'full';
}

export function isSessionComplete(session){
  const status = sessionStatus(session);
  return status === 'full' || status === 'min';
}

export function getCompletedDates(sessions){
  return Object.keys(sessions || {})
    .filter(date => isSessionComplete(sessions[date]))
    .sort();
}

/**
 * Si hoy todavía no está registrado, la racha espera: se cuenta desde ayer.
 * Un día parcial o vacío en el medio corta la racha.
 */
export function getCurrentStreak(sessions, todayISO = getLocalISODate()){
  const completed = new Set(getCompletedDates(sessions));
  let cursor = isISODate(todayISO) ? todayISO : getLocalISODate();
  if(!completed.has(cursor)) cursor = addDaysISO(cursor, -1);

  let streak = 0;
  while(completed.has(cursor)){
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function getBestStreak(sessions, todayISO = getLocalISODate()){
  const limit = isISODate(todayISO) ? todayISO : getLocalISODate();
  const dates = getCompletedDates(sessions).filter(date => date <= limit);
  let best = 0;
  let run = 0;
  let previous = '';

  dates.forEach(date => {
    if(previous && addDaysISO(previous, 1) === date){
      run++;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    previous = date;
  });

  return best;
}

export function getWeekSummary(sessions, dates){
  let completed = 0;
  let recorded = 0;
  let partial = 0;

  dates.forEach(date => {
    const session = getSession({ sessions }, date);
    const status = sessionStatus(session);
    if(status === 'full' || status === 'min') completed++;
    if(status === 'partial') partial++;
    if(status !== 'empty') recorded++;
  });

  return { completed, recorded, partial };
}
