import { LEGACY_STORAGE_KEY, STORAGE_KEY } from '../config.js';
import { SCHEMA_VERSION, createDefaultState } from './schema.js';
import { normalizeDays } from './normalize.js';

export let state = null;
let listener = null;
let schemaVersion = SCHEMA_VERSION;
let storageWarned = false;

function warnStorageError(e){
  if(storageWarned) return;
  storageWarned = true;
  console.warn('[GymRutina] No se pudo guardar en localStorage; los cambios quedan solo en memoria.', e);
}

function readRaw(key){
  try {
    return localStorage.getItem(key);
  } catch(e){
    return null;
  }
}

function readJSON(key){
  const raw = readRaw(key);
  if(!raw) return null;
  try {
    return JSON.parse(raw);
  } catch(e){
    // Conserva el contenido ilegible antes de que un guardado lo pise.
    try { localStorage.setItem(`${key}_corrupt_${Date.now()}`, raw); } catch(_){}
    return null;
  }
}

function readPayload(){
  const current = readJSON(STORAGE_KEY);
  if(current && typeof current === 'object'){
    const days = current.days ? normalizeDays(current.days) : normalizeDays(current);
    schemaVersion = SCHEMA_VERSION;
    return days;
  }

  const legacy = readJSON(LEGACY_STORAGE_KEY);
  if(legacy && typeof legacy === 'object'){
    schemaVersion = SCHEMA_VERSION;
    return normalizeDays(legacy);
  }

  schemaVersion = SCHEMA_VERSION;
  return createDefaultState();
}

export function load(){
  state = readPayload();
  persist();
  return state;
}

export function getState(){
  if(!state) load();
  return state;
}

function persist(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion, days: getState() }));
  } catch(e){
    warnStorageError(e);
  }
}

export function save(){
  persist();
}

export function getPayload(){
  return { schemaVersion, days: getState() };
}

export function replaceState(days){
  state = normalizeDays(days);
  schemaVersion = SCHEMA_VERSION;
  persist();
}

export function backupCurrentState(reason = 'manual'){
  const key = `${STORAGE_KEY}_backup_${reason}_${Date.now()}`;
  try {
    localStorage.setItem(key, JSON.stringify(getPayload()));
    return key;
  } catch(e){
    warnStorageError(e);
    return null;
  }
}

export function onChange(fn){
  listener = fn;
}

export function commit(){
  save();
  if(listener) listener();
}
