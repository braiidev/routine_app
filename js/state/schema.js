import { DAYS, DEFAULT_STEPS } from '../config.js';

export const SCHEMA_VERSION = 3;

export function createDefaultTemplateDay(name){
  return {
    title: name,
    defaultMode: 'completo',
    notes: '',
    groups: []
  };
}

export function createDefaultTemplate(){
  const template = {};
  DAYS.forEach(d => {
    template[d] = createDefaultTemplateDay(d);
  });
  return template;
}

export function createDefaultState(){
  return {
    schemaVersion: SCHEMA_VERSION,
    template: createDefaultTemplate(),
    sessions: {}
  };
}

export function createDefaultItem(){
  return {
    id: '',
    name: 'Nuevo ejercicio',
    steps: DEFAULT_STEPS,
    minName: null,
    minSteps: null
  };
}
