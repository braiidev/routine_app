import { DAYS, STORAGE_KEY } from '../config.js';
import { createDefaultDay, createDefaultState } from './schema.js';

export let state = null;
let listener = null;

export function load(){
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch(e){
    raw = {};
  }
  const base = createDefaultState();
  DAYS.forEach(d => {
    if(raw[d] && typeof raw[d] === 'object'){
      base[d] = { ...createDefaultDay(d), ...raw[d] };
      if(!Array.isArray(base[d].groups)) base[d].groups = [];
      if(!Array.isArray(base[d].log)) base[d].log = [];
    }
  });
  state = base;
  return state;
}

export function getState(){
  if(!state) load();
  return state;
}

export function save(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getState()));
  } catch(e){
    /* almacenamiento lleno o bloqueado: la app sigue funcionando en memoria */
  }
}

export function onChange(fn){
  listener = fn;
}

export function commit(){
  save();
  if(listener) listener();
}
