import { getState, commit } from '../state/store.js';
import { view } from '../state/view.js';
import {
  consideredTemplateGroups,
  getItemText,
  getSession,
  getSteps,
  sessionHasProgress
} from '../state/selectors.js';
import { getDayNameFromISODate, getLocalISODate } from '../utils/date.js';

const MODES = ['completo', 'minimo'];

function validMode(mode){
  return MODES.includes(mode) ? mode : 'completo';
}

export function buildSessionFromTemplate(templateDay, date, mode){
  if(!templateDay) return null;
  const safeMode = validMode(mode);
  return {
    date,
    day: getDayNameFromISODate(date),
    mode: safeMode,
    groups: consideredTemplateGroups(templateDay, safeMode).map(group => ({
      id: group.id,
      name: group.name,
      optional: group.optional,
      items: group.items.map(item => ({
        id: item.id,
        text: getItemText(item, safeMode),
        steps: getSteps(item, safeMode),
        done: 0
      }))
    }))
  };
}

export function modeForDate(date){
  const state = getState();
  const session = getSession(state, date);
  if(session) return session.mode;
  const draft = view.draftModes[date];
  if(MODES.includes(draft)) return draft;
  const day = state.template[getDayNameFromISODate(date)];
  return day ? day.defaultMode : 'completo';
}

export function previewSession(date, mode = modeForDate(date)){
  const state = getState();
  const day = state.template[getDayNameFromISODate(date)];
  return buildSessionFromTemplate(day, date, mode);
}

export function isDateEditable(date, allowPast = false){
  const today = getLocalISODate();
  if(date === today) return true;
  return Boolean(allowPast && date < today);
}

function findSessionItem(session, groupId, itemId){
  const group = (session?.groups || []).find(g => g.id === groupId);
  return group ? group.items.find(it => it.id === itemId) : null;
}

function ensureSession(date, allowPast, mode){
  if(!isDateEditable(date, allowPast)) return null;
  const existing = getSession(getState(), date);
  if(existing) return existing;

  const session = previewSession(date, mode || modeForDate(date));
  if(!session) return null;
  getState().sessions[date] = session;
  delete view.draftModes[date];
  return session;
}

function discardIfEmpty(date, session){
  if(sessionHasProgress(session)) return;
  delete getState().sessions[date];
  view.draftModes[date] = session.mode;
}

export function setSessionStep(date, groupId, itemId, n, allowPast = false){
  if(!Number.isFinite(n)) return false;
  const session = ensureSession(date, allowPast);
  if(!session) return false;

  const item = findSessionItem(session, groupId, itemId);
  if(!item){
    discardIfEmpty(date, session);
    return false;
  }

  const current = item.done || 0;
  let next = current === n ? n - 1 : n;
  next = Math.min(item.steps, Math.max(0, next));
  if(next === current){
    if(!sessionHasProgress(session)){
      discardIfEmpty(date, session);
      commit();
    }
    return false;
  }

  item.done = next;
  discardIfEmpty(date, session);
  commit();
  return true;
}

export function adjustSessionStep(date, groupId, itemId, delta, allowPast = false){
  if(!Number.isFinite(delta) || delta === 0) return false;
  const session = ensureSession(date, allowPast);
  if(!session) return false;

  const item = findSessionItem(session, groupId, itemId);
  if(!item){
    discardIfEmpty(date, session);
    return false;
  }

  const current = item.done || 0;
  const next = Math.min(item.steps, Math.max(0, current + delta));
  if(next === current) return false;

  item.done = next;
  discardIfEmpty(date, session);
  commit();
  return true;
}

export function switchSessionMode(date, mode, { force = false, allowPast = false } = {}){
  const safeMode = validMode(mode);
  if(!isDateEditable(date, allowPast)) return { ok: false, reason: 'locked' };

  const state = getState();
  const existing = getSession(state, date);
  if(existing && existing.mode === safeMode) return { ok: true, changed: false };

  if(existing && sessionHasProgress(existing) && !force){
    return { ok: false, needsReset: true };
  }

  if(existing) delete state.sessions[date];
  view.draftModes[date] = safeMode;
  commit();
  return { ok: true, changed: true, reset: Boolean(existing) };
}

export function resetSession(date, allowPast = false){
  if(!isDateEditable(date, allowPast)) return false;
  const state = getState();
  const session = getSession(state, date);
  if(!session) return false;

  const mode = session.mode;
  delete state.sessions[date];
  view.draftModes[date] = mode;
  commit();
  return true;
}

