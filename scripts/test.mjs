#!/usr/bin/env node
/**
 * test.mjs -- pruebas de la capa de estado y acciones, sin navegador.
 *
 * Uso: node scripts/test.mjs
 */
import assert from 'node:assert/strict';

const memory = {};
globalThis.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null),
  setItem: (k, v) => { memory[k] = String(v); },
  removeItem: (k) => { delete memory[k]; }
};
globalThis.document = {
  getElementById: () => null,
  querySelectorAll: () => []
};

const { LEGACY_STORAGE_KEY, STORAGE_KEY, DAYS } = await import('../js/config.js');
const { load, getState, save } = await import('../js/state/store.js');
const { isFinished } = await import('../js/state/selectors.js');
const { getLocalISODate } = await import('../js/utils/date.js');
const actions = await import('../js/features/actions.js');

let passed = 0;
function test(name, fn){
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch(e){
    console.error(`  x   ${name}`);
    console.error(`      ${e.message}`);
    process.exitCode = 1;
  }
}

function resetStorage(){
  Object.keys(memory).forEach(k => delete memory[k]);
}

/* 1. Migración del formato antiguo */

resetStorage();
memory[LEGACY_STORAGE_KEY] = JSON.stringify({
  Lun: {
    title: 'Lunes', mode: 'minimo', notes: 'nota',
    groups: [
      { id: 'g1', name: 'Pecho', items: [
        { id: 'i1', textCompleto: 'Press', textMinimo: 'Press M', stepsCompleto: '4', stepsMinimo: 2, progress: { completo: 9, minimo: -3 } },
        { id: 'i1', textCompleto: 'Dup', textMinimo: 'Dup', stepsCompleto: 0, progress: { completo: 1 } }
      ]},
      null,
      'basura'
    ],
    log: [
      { date: '2026-01-05', mode: 'completo', items: [{ text: 'Press', done: true, group: 'Pecho' }], status: 'full' },
      { date: 'mal' }
    ]
  }
});

const migrated = load();
const lun = migrated.Lun;

test('migra titulo, modo y notas', () => {
  assert.equal(lun.title, 'Lunes');
  assert.equal(lun.mode, 'minimo');
  assert.equal(lun.notes, 'nota');
});

test('descarta grupos invalidos y conserva los validos', () => {
  assert.equal(lun.groups.length, 1);
  assert.equal(lun.groups[0].name, 'Pecho');
});

test('normaliza ids duplicados y pasos numericos', () => {
  const items = lun.groups[0].items;
  assert.equal(new Set(items.map(i => i.id)).size, 2);
  assert.equal(items[0].stepsCompleto, 4);
  assert.equal(items[0].stepsMinimo, 2);
  assert.equal(items[1].stepsCompleto, 1);
});

test('recorta el progreso a los limites de cada modo', () => {
  const p = lun.groups[0].items[0].progress;
  assert.equal(p.completo, 4);
  assert.equal(p.minimo, 0);
});

test('conserva solo entradas de historial con fecha valida', () => {
  assert.equal(lun.log.length, 1);
  assert.equal(lun.log[0].date, '2026-01-05');
});

test('completa los 7 dias aunque falten en el origen', () => {
  assert.equal(Object.keys(migrated).length, DAYS.length);
  assert.ok(migrated.Mar && migrated.Dom);
});

test('escribe el nuevo esquema y deja intacto el antiguo', () => {
  const saved = JSON.parse(memory[STORAGE_KEY]);
  assert.equal(saved.schemaVersion, 1);
  assert.equal(JSON.parse(memory[LEGACY_STORAGE_KEY]).Lun.notes, 'nota');
});

/* 2. Acciones sobre estado limpio */

resetStorage();
load();
const today = getLocalISODate();

test('agrega grupo y lo persiste', () => {
  actions.addGroup();
  const day = getState().Lun;
  assert.equal(day.groups.length, 1);
  assert.equal(day.groups[0].name, 'Nuevo grupo');
  assert.equal(JSON.parse(memory[STORAGE_KEY]).days.Lun.groups.length, 1);
});

const gid = getState().Lun.groups[0].id;

test('agrega item con valores por defecto validos', () => {
  actions.addItem(gid);
  const item = getState().Lun.groups[0].items[0];
  assert.equal(item.stepsCompleto, 1);
  assert.equal(item.progress.completo, 0);
});

const iid = getState().Lun.groups[0].items[0].id;

test('edita pasos y recorta el progreso existente', () => {
  actions.updateItemField(gid, iid, 'stepsCompleto', '3');
  actions.setStep(gid, iid, 2);
  actions.updateItemField(gid, iid, 'stepsCompleto', '1');
  const item = getState().Lun.groups[0].items[0];
  assert.equal(item.stepsCompleto, 1);
  assert.equal(item.progress.completo, 1);
});

test('ignora campos no editables', () => {
  const before = JSON.stringify(getState().Lun);
  actions.updateItemField(gid, iid, 'id', 'hackeado');
  assert.equal(JSON.stringify(getState().Lun), before);
});

test('marca el dia como completado y registra historial', () => {
  actions.updateItemField(gid, iid, 'stepsCompleto', '2');
  actions.setStep(gid, iid, 2);
  const day = getState().Lun;
  assert.equal(day.log.length, 1);
  assert.equal(day.log[0].date, today);
  assert.equal(day.log[0].status, 'full');
  assert.ok(isFinished(getState(), 'Lun', 'completo'));
});

test('no duplica el historial del mismo dia y modo', () => {
  actions.bumpStep(gid, iid);
  actions.bumpStep(gid, iid);
  assert.equal(getState().Lun.log.filter(l => l.date === today && l.mode === 'completo').length, 1);
});

test('el modo minimo ignora los grupos opcionales', () => {
  actions.addGroup();
  const optionalId = getState().Lun.groups[1].id;
  actions.toggleGroupOptional(optionalId);
  actions.addItem(optionalId);
  actions.setMode('minimo');
  actions.bumpStep(gid, iid);
  assert.equal(isFinished(getState(), 'Lun', 'minimo'), true);
});

test('el borrado de grupo requiere confirmacion', () => {
  const before = getState().Lun.groups.length;
  actions.deleteGroup(gid);
  assert.equal(getState().Lun.groups.length, before);
  actions.deleteGroup(gid);
  assert.equal(getState().Lun.groups.length, before - 1);
});

test('el borrado de item requiere confirmacion', () => {
  const optional = getState().Lun.groups[0];
  const itemId = optional.items[0].id;
  const before = optional.items.length;
  actions.deleteItem(optional.id, itemId);
  assert.equal(getState().Lun.groups[0].items.length, before);
  actions.deleteItem(optional.id, itemId);
  assert.equal(getState().Lun.groups[0].items.length, before - 1);
});

test('resetDay pide confirmacion y luego limpia el progreso', () => {
  actions.addGroup();
  const g = getState().Lun.groups[getState().Lun.groups.length - 1];
  actions.addItem(g.id);
  const itemId = g.items[0].id;
  actions.setStep(g.id, itemId, 1);
  assert.equal(getState().Lun.groups.at(-1).items[0].progress.minimo, 1);
  actions.resetDay();
  assert.equal(getState().Lun.groups.at(-1).items[0].progress.minimo, 1);
  actions.resetDay();
  assert.equal(getState().Lun.groups.at(-1).items[0].progress.minimo, 0);
});

test('save conserva el esquema versionado', () => {
  save();
  assert.equal(JSON.parse(memory[STORAGE_KEY]).schemaVersion, 1);
});

console.log(`\n  ${passed} pruebas superadas.\n`);
if(process.exitCode) process.exit(process.exitCode);
