import { DAYS } from '../config.js';
import { SCHEMA_VERSION } from './schema.js';
import { uid } from '../utils/dom.js';

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

export function normalizeItem(raw, usedIds){
  const item = raw && typeof raw === 'object' ? raw : {};
  const stepsCompleto = Math.max(1, int(item.stepsCompleto, 1));
  const stepsMinimo = Math.max(1, int(item.stepsMinimo, 1));
  const p = item.progress && typeof item.progress === 'object' ? item.progress : {};

  return {
    id: uniqueId(item.id, usedIds),
    textCompleto: str(item.textCompleto, 'Nuevo ítem'),
    textMinimo: str(item.textMinimo, 'Nuevo ítem'),
    stepsCompleto,
    stepsMinimo,
    progress: {
      completo: clamp(int(p.completo, 0), 0, stepsCompleto),
      minimo: clamp(int(p.minimo, 0), 0, stepsMinimo)
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
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

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

export function normalizePayload(raw){
  const payload = raw && typeof raw === 'object' ? raw : {};
  const version = int(payload.schemaVersion, SCHEMA_VERSION);
  if(version > SCHEMA_VERSION){
    console.warn(`[GymRutina] Datos guardados con esquema v${version}; esta versión solo conoce v${SCHEMA_VERSION}. Se normalizan sin borrar campos.`);
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    days: normalizeDays(payload.days)
  };
}
