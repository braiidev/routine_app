import { DAYS, DEFAULT_STEPS } from '../config.js';

export const SCHEMA_VERSION = 2;

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
    name: 'Nuevo ejercicio',
    steps: DEFAULT_STEPS,
    minName: null,
    minSteps: null,
    progress: { completo: 0, minimo: 0 }
  };
}
