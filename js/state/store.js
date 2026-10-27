import { LEGACY_STORAGE_KEY, STORAGE_KEY, LAST_ACTIVE_KEY } from '../config.js';
import { SCHEMA_VERSION, createDefaultState } from './schema.js';
import { normalizePayload } from './normalize.js';
import { getLocalISODate } from '../utils/date.js';

export let state = null;
let listener = null;
let storageErrorListener = null;
let storageWarned = false;
let quotaNotified = false;

function warnStorageError(e){
  if(storageWarned) return;
  storageWarned = true;
  console.warn('[GymRutina] No se pudo guardar en localStorage; los cambios quedan solo en memoria.', e);
  if(storageErrorListener) storageErrorListener(e);
}

export function onStorageError(fn){
  storageErrorListener = fn;
}

function isQuotaError(e){
  if(!e) return false;
  if(e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
  if(e.code === 22 || e.code === 1014) return true;
  return false;
}

function listGymrutinaKeys(){
  const keys = [];
  try {
    for(let i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      if(key && key.indexOf('gymrutina_') === 0) keys.push(key);
    }
  } catch(e){
    return [];
  }
  return keys;
}

export function cleanupOldBackups({ keep = 2 } = {}){
  const keys = listGymrutinaKeys();
  const current = STORAGE_KEY;
  const currentDate = LAST_ACTIVE_KEY;

  const candidates = [];
  keys.forEach(key => {
    if(key === current) return;
    if(key === currentDate) return;
    if(key.indexOf(`${current}_backup_pre_v3_`) === 0) return;
    if(key.indexOf(`${current}_backup_pre_import_`) === 0) return;

    if(key.indexOf(`${current}_backup_`) === 0) candidates.push(key);
    else if(key.indexOf(`${current}_corrupt_`) === 0) candidates.push(key);
    else if(key.indexOf(`${current}_backup_future_`) === 0) candidates.push(key);
  });

  if(candidates.length <= keep) return;
  candidates.sort((a, b) => b.localeCompare(a));
  const toRemove = candidates.slice(keep);
  toRemove.forEach(key => {
    try { localStorage.removeItem(key); } catch(e){}
  });
}

export function getLastActiveDate(){
  try {
    return localStorage.getItem(LAST_ACTIVE_KEY) || '';
  } catch(e){
    return '';
  }
}

export function setLastActiveDate(date){
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, date);
  } catch(e){
    warnStorageError(e);
  }
}

function readRaw(key){
  try {
    return localStorage.getItem(key);
  } catch(e){
    return null;
  }
}

function parseRaw(raw, key){
  if(!raw) return null;
  try {
    return JSON.parse(raw);
  } catch(e){
    // Conserva el contenido ilegible antes de que un guardado lo pise.
    try { localStorage.setItem(`${key}_corrupt_${Date.now()}`, raw); } catch(_){}
    return null;
  }
}

function saveBackup(key, raw, suffix){
  if(!raw) return;
  try {
    localStorage.setItem(`${key}_${suffix}_${Date.now()}`, raw);
  } catch(e) {
    warnStorageError(e);
  }
}

function backupIfNeeded(key, raw, payload){
  const version = Number(payload?.schemaVersion);
  if(Number.isFinite(version) && version > SCHEMA_VERSION){
    saveBackup(key, raw, `backup_future_v${version}`);
    return;
  }
  if(isLegacyPayload(payload)) saveBackup(key, raw, 'backup_pre_v3');
}

function isLegacyPayload(payload){
  if(!payload || typeof payload !== 'object') return false;
  const version = Number(payload.schemaVersion);
  if(Number.isFinite(version)) return version < SCHEMA_VERSION;
  if(payload.template && typeof payload.template === 'object') return false;
  if(payload.sessions && typeof payload.sessions === 'object') return false;
  return true;
}

function readPayload(){
  const currentRaw = readRaw(STORAGE_KEY);
  const current = parseRaw(currentRaw, STORAGE_KEY);
  if(current && typeof current === 'object'){
    backupIfNeeded(STORAGE_KEY, currentRaw, current);
    return normalizePayload(current, { lastActiveDate: getLastActiveDate() });
  }

  const legacyRaw = readRaw(LEGACY_STORAGE_KEY);
  const legacy = parseRaw(legacyRaw, LEGACY_STORAGE_KEY);
  if(legacy && typeof legacy === 'object'){
    backupIfNeeded(LEGACY_STORAGE_KEY, legacyRaw, legacy);
    return normalizePayload(legacy, { lastActiveDate: getLastActiveDate() });
  }

  return createDefaultState();
}

export function load(){
  state = readPayload();
  try { cleanupOldBackups({ keep: 2 }); } catch(_){}
  persist();
  return state;
}

export function getState(){
  if(!state) load();
  return state;
}

export function getTemplate(){
  return getState().template;
}

export function getSessions(){
  return getState().sessions;
}

export function getPayload(){
  return getState();
}

function persist(){
  const data = JSON.stringify({
    ...getState(),
    schemaVersion: SCHEMA_VERSION
  });
  try {
    localStorage.setItem(STORAGE_KEY, data);
    return;
  } catch(e){
    if(isQuotaError(e)){
      try { cleanupOldBackups({ keep: 2 }); } catch(_){}
      try {
        localStorage.setItem(STORAGE_KEY, data);
        return;
      } catch(e2){
        if(!quotaNotified){
          quotaNotified = true;
          if(storageErrorListener) storageErrorListener({ quota: true, original: e2 });
        }
        warnStorageError(e2);
        return;
      }
    }
    warnStorageError(e);
  }
}

export function save(){
  persist();
}

export function replaceState(payload){
  state = normalizePayload(payload, {
    lastActiveDate: getLastActiveDate() || getLocalISODate()
  });
  try { cleanupOldBackups({ keep: 2 }); } catch(_){}
  persist();
}

export function backupCurrentState(reason = 'manual'){
  const key = `${STORAGE_KEY}_backup_${reason}_${Date.now()}`;
  try {
    localStorage.setItem(key, JSON.stringify(getState()));
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
