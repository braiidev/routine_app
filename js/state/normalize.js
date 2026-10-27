import { DAYS, MAX_STEPS } from '../config.js';
import { SCHEMA_VERSION } from './schema.js';
import { uid } from '../utils/dom.js';
import { getDayNameFromISODate, getLocalISODate, isISODate } from '../utils/date.js';

const MODES = ['completo', 'minimo'];
const STATUSES = ['full', 'min', 'partial'];

function str(value, fallback = ''){
  if(typeof value === 'string') return value;
  return value == null ? fallback : String(value);
}

function int(value, fallback = 0){
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max){
  return Math.min(max, Math.max(min, n));
}

function uniqueId(rawId, used){
  let id = str(rawId);
  if(!id || used.has(id)) id = uid();
  used.add(id);
  return id;
}

function normalizeMinName(value, sharedName){
  if(value == null) return null;
  const text = str(value);
  return text && text !== sharedName ? text : null;
}

function normalizeMinSteps(value, sharedSteps){
  if(value == null) return null;
  const steps = clamp(int(value, sharedSteps), 1, MAX_STEPS);
  return steps !== sharedSteps ? steps : null;
}

function effectiveName(item, mode){
  if(mode === 'minimo' && item.minName != null && item.minName !== '') return item.minName;
  return item.name;
}

function effectiveSteps(item, mode){
  if(mode === 'minimo' && item.minSteps != null) return item.minSteps;
  return item.steps;
}

/* ------------------------------------------------------------------ */
/* Normalización del formato viejo (v1 y v2)                           */
/* ------------------------------------------------------------------ */

export function normalizeItem(raw, usedIds){
  const item = raw && typeof raw === 'object' ? raw : {};
  // El formato v2 tiene name/steps/min*; el v1 duplicaba textCompleto/textMinimo.
  const isV2 = 'name' in item || 'steps' in item || 'minName' in item || 'minSteps' in item;

  const name = isV2
    ? str(item.name, 'Nuevo ejercicio')
    : str(item.textCompleto, 'Nuevo ejercicio');
  const steps = clamp(
    int(isV2 ? item.steps : item.stepsCompleto, 1),
    1,
    MAX_STEPS
  );

  let minName = null;
  let minSteps = null;
  if(isV2){
    // En v2 un valor propio se conserva aunque coincida con el compartido:
    // así el interruptor "valores propios" no se apaga al recargar.
    minName = item.minName == null || item.minName === '' ? null : str(item.minName);
    minSteps = item.minSteps == null ? null : clamp(int(item.minSteps, steps), 1, MAX_STEPS);
  } else {
    minName = normalizeMinName(item.textMinimo, name);
    minSteps = normalizeMinSteps(item.stepsMinimo, steps);
  }

  const effectiveMinSteps = minSteps == null ? steps : minSteps;
  const p = item.progress && typeof item.progress === 'object' ? item.progress : {};

  return {
    id: uniqueId(item.id, usedIds),
    name,
    steps,
    minName,
    minSteps,
    progress: {
      completo: clamp(int(p.completo, 0), 0, steps),
      minimo: clamp(int(p.minimo, 0), 0, effectiveMinSteps)
    }
  };
}

export function normalizeGroup(raw, usedGroupIds, usedItemIds){
  const group = raw && typeof raw === 'object' ? raw : {};
  const items = Array.isArray(group.items) ? group.items.filter(it => it && typeof it === 'object') : [];

  return {
    id: uniqueId(group.id, usedGroupIds),
    name: str(group.name, 'Grupo'),
    optional: Boolean(group.optional),
    items: items.map(it => normalizeItem(it, usedItemIds))
  };
}

function normalizeLogEntry(raw){
  const entry = raw && typeof raw === 'object' ? raw : {};
  const date = str(entry.date);
  if(!isISODate(date)) return null;

  const items = (Array.isArray(entry.items) ? entry.items : []).map(it => {
    const row = it && typeof it === 'object' ? it : {};
    return { text: str(row.text), done: Boolean(row.done), group: str(row.group) };
  });

  const allDone = items.length > 0 && items.every(i => i.done);
  const mode = MODES.includes(entry.mode) ? entry.mode : 'completo';
  const status = STATUSES.includes(entry.status)
    ? entry.status
    : allDone ? (mode === 'completo' ? 'full' : 'min') : 'partial';

  return { date, mode, items, status };
}

export function normalizeDay(raw, name){
  const day = raw && typeof raw === 'object' ? raw : {};
  const usedGroupIds = new Set();
  const usedItemIds = new Set();
  const groups = Array.isArray(day.groups) ? day.groups.filter(g => g && typeof g === 'object') : [];
  const log = Array.isArray(day.log) ? day.log : [];

  return {
    title: str(day.title, name),
    mode: MODES.includes(day.mode) ? day.mode : 'completo',
    notes: str(day.notes),
    groups: groups.map(g => normalizeGroup(g, usedGroupIds, usedItemIds)),
    log: log.map(normalizeLogEntry).filter(Boolean)
  };
}

export function normalizeDays(rawDays){
  const source = rawDays && typeof rawDays === 'object' ? rawDays : {};
  const days = {};
  DAYS.forEach(name => {
    days[name] = normalizeDay(source[name], name);
  });
  return days;
}

/* ------------------------------------------------------------------ */
/* Plantilla v3                                                        */
/* ------------------------------------------------------------------ */

export function normalizeTemplateItem(raw, usedIds){
  const item = normalizeItem(raw, usedIds);
  return {
    id: item.id,
    name: item.name,
    steps: item.steps,
    minName: item.minName,
    minSteps: item.minSteps
  };
}

export function normalizeTemplateGroup(raw, usedGroupIds, usedItemIds){
  const group = raw && typeof raw === 'object' ? raw : {};
  const items = Array.isArray(group.items) ? group.items.filter(it => it && typeof it === 'object') : [];

  return {
    id: uniqueId(group.id, usedGroupIds),
    name: str(group.name, 'Grupo'),
    optional: Boolean(group.optional),
    items: items.map(it => normalizeTemplateItem(it, usedItemIds))
  };
}

export function normalizeTemplateDay(raw, name){
  const day = raw && typeof raw === 'object' ? raw : {};
  const usedGroupIds = new Set();
  const usedItemIds = new Set();
  const groups = Array.isArray(day.groups) ? day.groups.filter(g => g && typeof g === 'object') : [];
  const mode = day.defaultMode != null ? day.defaultMode : day.mode;

  return {
    title: str(day.title, name),
    defaultMode: MODES.includes(mode) ? mode : 'completo',
    notes: str(day.notes),
    groups: groups.map(g => normalizeTemplateGroup(g, usedGroupIds, usedItemIds))
  };
}

export function normalizeTemplate(rawTemplate){
  const source = rawTemplate && typeof rawTemplate === 'object' ? rawTemplate : {};
  const template = {};
  DAYS.forEach(name => {
    template[name] = normalizeTemplateDay(source[name], name);
  });
  return template;
}

/* ------------------------------------------------------------------ */
/* Sesiones v3                                                         */
/* ------------------------------------------------------------------ */

export function normalizeSessionItem(raw, usedIds = new Set()){
  const item = raw && typeof raw === 'object' ? raw : {};
  const steps = clamp(int(item.steps, 1), 1, MAX_STEPS);
  const done = typeof item.done === 'boolean'
    ? (item.done ? steps : 0)
    : clamp(int(item.done, 0), 0, steps);

  return {
    id: uniqueId(item.id, usedIds),
    text: str(item.text, str(item.name, 'Ejercicio')),
    steps,
    done
  };
}

export function normalizeSessionGroup(raw, usedGroupIds = new Set(), usedItemIds = new Set()){
  const group = raw && typeof raw === 'object' ? raw : {};
  const items = Array.isArray(group.items) ? group.items.filter(it => it && typeof it === 'object') : [];

  return {
    id: uniqueId(group.id, usedGroupIds),
    name: str(group.name, str(group.group, 'Grupo')),
    optional: Boolean(group.optional),
    items: items.map(it => normalizeSessionItem(it, usedItemIds))
  };
}

function groupsFromFlatItems(rawItems){
  const groups = new Map();
  (Array.isArray(rawItems) ? rawItems : []).forEach(raw => {
    const item = raw && typeof raw === 'object' ? raw : {};
    const name = str(item.group, 'General') || 'General';
    if(!groups.has(name)) groups.set(name, { name, items: [] });
    groups.get(name).items.push(item);
  });
  return Array.from(groups.values());
}

export function normalizeSession(raw, date, dayName){
  const session = raw && typeof raw === 'object' ? raw : {};
  const isoDate = isISODate(session.date) ? session.date : date;
  if(!isISODate(isoDate)) return null;

  const day = DAYS.includes(session.day) ? session.day : (dayName || getDayNameFromISODate(isoDate));
  const mode = MODES.includes(session.mode) ? session.mode : 'completo';
  const rawGroups = Array.isArray(session.groups)
    ? session.groups
    : groupsFromFlatItems(session.items);
  const usedGroupIds = new Set();
  const usedItemIds = new Set();

  return {
    date: isoDate,
    day,
    mode,
    groups: rawGroups
      .filter(g => g && typeof g === 'object')
      .map(g => normalizeSessionGroup(g, usedGroupIds, usedItemIds))
  };
}

export function sessionHasProgress(session){
  if(!session || !Array.isArray(session.groups)) return false;
  return session.groups.some(g => (Array.isArray(g.items) ? g.items : []).some(it => (it.done || 0) > 0));
}

function sessionStatus(session){
  const items = (session.groups || []).flatMap(g => g.items || []);
  if(items.length === 0) return 'partial';
  const done = items.filter(it => it.done >= it.steps).length;
  if(done !== items.length) return 'partial';
  return session.mode === 'minimo' ? 'min' : 'full';
}

function statusRank(status){
  return status === 'full' ? 3 : status === 'min' ? 2 : 1;
}

function sessionScore(session){
  const items = (session.groups || []).flatMap(g => g.items || []);
  const done = items.reduce((n, it) => n + (it.done || 0), 0);
  return statusRank(sessionStatus(session)) * 100000 + done;
}

function keepBetterSession(sessions, session){
  if(!session || !sessionHasProgress(session)) return;
  const current = sessions[session.date];
  if(!current || sessionScore(session) > sessionScore(current)){
    sessions[session.date] = session;
  }
}

export function normalizeSessions(rawSessions){
  const sessions = {};
  if(!rawSessions || typeof rawSessions !== 'object' || Array.isArray(rawSessions)) return sessions;

  Object.entries(rawSessions).forEach(([date, raw]) => {
    const session = normalizeSession(raw, date);
    keepBetterSession(sessions, session);
  });
  return sessions;
}

/* ------------------------------------------------------------------ */
/* Migración v1/v2 -> v3                                                */
/* ------------------------------------------------------------------ */

function templateFromLegacy(days){
  const template = {};
  DAYS.forEach(name => {
    const day = days[name];
    template[name] = {
      title: day.title,
      defaultMode: day.mode,
      notes: day.notes,
      groups: day.groups.map(g => ({
        id: g.id,
        name: g.name,
        optional: g.optional,
        items: g.items.map(it => ({
          id: it.id,
          name: it.name,
          steps: it.steps,
          minName: it.minName,
          minSteps: it.minSteps
        }))
      }))
    };
  });
  return template;
}

function findTemplateItem(templateDay, groupName, text, mode){
  const groups = Array.isArray(templateDay?.groups) ? templateDay.groups : [];
  for(const group of groups){
    if(group.name !== groupName) continue;
    const item = group.items.find(it => effectiveName(it, mode) === text);
    if(item) return { group, item };
  }
  for(const group of groups){
    const item = group.items.find(it => effectiveName(it, mode) === text);
    if(item) return { group, item };
  }
  return null;
}

function sessionFromLogEntry(entry, dayName, templateDay){
  if(!entry || !entry.items.length) return null;
  const mode = MODES.includes(entry.mode) ? entry.mode : 'completo';
  const groups = new Map();
  let itemNumber = 0;

  entry.items.forEach(row => {
    const groupName = row.group || 'General';
    if(!groups.has(groupName)){
      const found = (templateDay?.groups || []).find(g => g.name === groupName);
      groups.set(groupName, {
        id: found ? found.id : `log-g${groups.size + 1}`,
        name: groupName,
        optional: Boolean(found?.optional),
        items: []
      });
    }
    const match = findTemplateItem(templateDay, groupName, row.text, mode);
    const item = match?.item;
    const steps = item ? effectiveSteps(item, mode) : 1;
    groups.get(groupName).items.push({
      id: item ? item.id : `log-i${++itemNumber}`,
      text: row.text || (item ? effectiveName(item, mode) : 'Ejercicio'),
      steps,
      done: row.done ? steps : 0
    });
  });

  return {
    date: entry.date,
    day: dayName,
    mode,
    groups: Array.from(groups.values())
  };
}

function sessionFromProgress(legacyDay, dayName, date){
  if(!legacyDay) return null;
  const mode = legacyDay.mode;
  const groups = legacyDay.groups
    .filter(g => mode !== 'minimo' || !g.optional)
    .map(g => ({
      id: g.id,
      name: g.name,
      optional: g.optional,
      items: g.items.map(it => ({
        id: it.id,
        text: effectiveName(it, mode),
        steps: effectiveSteps(it, mode),
        done: it.progress[mode] || 0
      }))
    }));

  const session = { date, day: dayName, mode, groups };
  return sessionHasProgress(session) ? session : null;
}

export function migrateLegacyToState(rawDays, lastActiveDate){
  const days = normalizeDays(rawDays);
  const template = templateFromLegacy(days);
  const sessions = {};

  DAYS.forEach(dayName => {
    days[dayName].log.forEach(entry => {
      keepBetterSession(sessions, sessionFromLogEntry(entry, dayName, template[dayName]));
    });
  });

  const activeDate = isISODate(lastActiveDate) ? lastActiveDate : getLocalISODate();
  const activeDay = getDayNameFromISODate(activeDate);
  keepBetterSession(sessions, sessionFromProgress(days[activeDay], activeDay, activeDate));

  return {
    schemaVersion: SCHEMA_VERSION,
    template,
    sessions
  };
}

export function normalizePayload(raw, options = {}){
  const payload = raw && typeof raw === 'object' ? raw : {};
  const version = int(payload.schemaVersion, 0);
  const looksV3 = version >= 3 ||
    (payload.template && typeof payload.template === 'object') ||
    (payload.sessions && typeof payload.sessions === 'object');

  if(looksV3){
    if(version > SCHEMA_VERSION){
      console.warn(`[GymRutina] Datos guardados con esquema v${version}; esta versión solo conoce v${SCHEMA_VERSION}. Se normalizan al formato conocido y se conserva una copia del original antes de guardar.`);
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      template: normalizeTemplate(payload.template || payload.days),
      sessions: normalizeSessions(payload.sessions)
    };
  }

  const source = payload.days && typeof payload.days === 'object' && !Array.isArray(payload.days)
    ? payload.days
    : payload;
  return migrateLegacyToState(source, options.lastActiveDate);
}
