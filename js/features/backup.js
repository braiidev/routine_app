import { DAYS } from '../config.js';
import { SCHEMA_VERSION } from '../state/schema.js';
import { normalizePayload } from '../state/normalize.js';
import { sessionStatus } from '../state/selectors.js';
import { getLocalISODate } from '../utils/date.js';

export function buildExportPayload(state, now = new Date()){
  return {
    app: 'gymrutina',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    template: state.template,
    sessions: state.sessions
  };
}

export function suggestExportFilename(now = new Date()){
  return `gymrutina-${getLocalISODate(now)}.json`;
}

export function summarizeState(state){
  const template = state?.template || {};
  const sessions = state?.sessions || {};
  let groups = 0;
  let items = 0;
  let daysWithData = 0;

  DAYS.forEach(name => {
    const day = template[name];
    if(!day) return;
    const dayGroups = Array.isArray(day.groups) ? day.groups : [];
    groups += dayGroups.length;
    dayGroups.forEach(g => {
      items += Array.isArray(g.items) ? g.items.length : 0;
    });
    if(dayGroups.length || (day.notes && day.notes.trim())) daysWithData++;
  });

  let completed = 0;
  let partial = 0;
  Object.values(sessions).forEach(session => {
    const status = sessionStatus(session);
    if(status === 'full' || status === 'min') completed++;
    else if(status === 'partial') partial++;
  });

  return {
    days: DAYS.length,
    daysWithData,
    groups,
    items,
    sessions: Object.keys(sessions).length,
    completed,
    partial
  };
}

function validateDays(source, version){
  if(!source || typeof source !== 'object' || Array.isArray(source)){
    throw new Error('El archivo no contiene una rutina válida.');
  }
  const missing = DAYS.filter(d => !source[d] || typeof source[d] !== 'object');
  if(missing.length === DAYS.length){
    throw new Error('El archivo no tiene días de rutina reconocibles.');
  }
  if(missing.length){
    throw new Error(`El archivo no tiene los 7 días de la rutina (faltan: ${missing.join(', ')}).`);
  }
  if(version >= 3 && source.sessions != null && (typeof source.sessions !== 'object' || Array.isArray(source.sessions))){
    throw new Error('El historial de sesiones del archivo no es válido.');
  }
}

export function parseImport(text){
  let raw;
  try {
    raw = JSON.parse(text);
  } catch(e){
    throw new Error('El archivo no es JSON válido.');
  }

  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new Error('El archivo no contiene una rutina válida.');
  }

  if(raw.schemaVersion != null && !Number.isFinite(Number(raw.schemaVersion))){
    throw new Error('La versión del archivo no es válida.');
  }

  const version = raw.schemaVersion == null ? 1 : Number(raw.schemaVersion);
  if(version > SCHEMA_VERSION){
    throw new Error(`El archivo usa el esquema v${version} y esta app solo llega a v${SCHEMA_VERSION}.`);
  }

  if(version >= 3){
    validateDays(raw.template, version);
  } else {
    const source = raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days) ? raw.days : raw;
    validateDays(source, version);
  }

  const state = normalizePayload(raw, { lastActiveDate: getLocalISODate() });
  return { state, version, summary: summarizeState(state) };
}
