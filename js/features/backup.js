import { DAYS } from '../config.js';
import { SCHEMA_VERSION } from '../state/schema.js';
import { normalizeDays } from '../state/normalize.js';
import { getLocalISODate } from '../utils/date.js';

export function buildExportPayload(days, now = new Date()){
  return {
    app: 'gymrutina',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    days
  };
}

export function suggestExportFilename(now = new Date()){
  return `gymrutina-${getLocalISODate(now)}.json`;
}

export function summarizeDays(days){
  const list = Object.values(days || {});
  let groups = 0;
  let items = 0;
  let log = 0;
  let daysWithData = 0;

  list.forEach(day => {
    const dayGroups = Array.isArray(day.groups) ? day.groups : [];
    groups += dayGroups.length;
    dayGroups.forEach(g => {
      items += Array.isArray(g.items) ? g.items.length : 0;
    });
    const dayLog = Array.isArray(day.log) ? day.log.length : 0;
    log += dayLog;
    if(dayGroups.length || (day.notes && day.notes.trim()) || dayLog) daysWithData++;
  });

  return { days: list.length, daysWithData, groups, items, log };
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

  const source = raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days) ? raw.days : raw;
  const missing = DAYS.filter(d => !source[d] || typeof source[d] !== 'object');
  if(missing.length === DAYS.length){
    throw new Error('El archivo no tiene días de rutina reconocibles.');
  }
  if(missing.length){
    throw new Error(`El archivo no tiene los 7 días de la rutina (faltan: ${missing.join(', ')}).`);
  }

  if(raw.schemaVersion != null && !Number.isFinite(Number(raw.schemaVersion))){
    throw new Error('La versión del archivo no es válida.');
  }
  const version = raw.schemaVersion == null ? 1 : Number(raw.schemaVersion);
  if(version > SCHEMA_VERSION){
    throw new Error(`El archivo usa el esquema v${version} y esta app solo llega a v${SCHEMA_VERSION}.`);
  }

  const days = normalizeDays(source);
  return { days, version, summary: summarizeDays(days) };
}
