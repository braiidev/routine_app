import { DAYS } from '../config.js';

export const SCHEMA_VERSION = 1;

export function createDefaultDay(name){
  return {
    title: name,
    mode: 'completo',
    notes: '',
    groups: [],
    log: []
  };
}

export function createDefaultState(){
  const s = {};
  DAYS.forEach(d => {
    s[d] = createDefaultDay(d);
  });
  return s;
}

export function createDefaultItem(){
  return {
    id: '',
    textCompleto: 'Nuevo ítem',
    textMinimo: 'Nuevo ítem',
    stepsCompleto: 1,
    stepsMinimo: 1,
    progress: { completo: 0, minimo: 0 }
  };
}
