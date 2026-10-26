#!/usr/bin/env node
/**
 * test.mjs -- pruebas de la capa de estado y acciones, sin navegador.
 *
 * Uso: node scripts/test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const memory = {};
globalThis.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null),
  setItem: (k, v) => { memory[k] = String(v); },
  removeItem: (k) => { delete memory[k]; }
};
globalThis.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  createElement: () => {
    let text = '';
    return {
      set textContent(value){ text = value == null ? '' : String(value); },
      get innerHTML(){
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }
    };
  }
};

const { LEGACY_STORAGE_KEY, STORAGE_KEY, DAYS, DEFAULT_STEPS } = await import('../js/config.js');
const { load, getState, save, backupCurrentState, replaceState, getPayload, onStorageError, getLastActiveDate, setLastActiveDate } = await import('../js/state/store.js');
const { SCHEMA_VERSION } = await import('../js/state/schema.js');
const { getItemText, getSteps, isFinished } = await import('../js/state/selectors.js');
const { normalizeItem } = await import('../js/state/normalize.js');
const { view } = await import('../js/state/view.js');
const { renderGroups, renderNotes } = await import('../js/ui/groups.js');
const { renderHistory } = await import('../js/ui/history.js');
const { getLocalISODate } = await import('../js/utils/date.js');
const { formatDuration, remainingFromDeadline } = await import('../js/utils/time.js');
const { buildExportPayload, parseImport, suggestExportFilename, summarizeDays } = await import('../js/features/backup.js');
const { rolloverDay } = await import('../js/features/rollover.js');
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

/* 1. Migración del formato antiguo (v1 -> v2) */

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

test('migra el item v1 al modelo name/steps/min*', () => {
  const items = lun.groups[0].items;
  assert.equal(new Set(items.map(i => i.id)).size, 2);
  assert.equal(items[0].name, 'Press');
  assert.equal(items[0].steps, 4);
  assert.equal(items[0].minName, 'Press M');
  assert.equal(items[0].minSteps, 2);
  assert.equal(Object.prototype.hasOwnProperty.call(items[0], 'textCompleto'), false);
  assert.equal(items[1].name, 'Dup');
  assert.equal(items[1].steps, 1);
  assert.equal(items[1].minName, null);
  assert.equal(items[1].minSteps, null);
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

test('escribe el esquema v2 y deja intacto el antiguo', () => {
  const saved = JSON.parse(memory[STORAGE_KEY]);
  assert.equal(saved.schemaVersion, SCHEMA_VERSION);
  assert.equal(saved.schemaVersion, 2);
  assert.equal(JSON.parse(memory[LEGACY_STORAGE_KEY]).Lun.notes, 'nota');
});

test('normaliza v2 sin apagar un override explicito', () => {
  const item = normalizeItem({
    id: 'x', name: 'Press', steps: 4, minName: 'Press', minSteps: 4,
    progress: { completo: 9, minimo: 9 }
  }, new Set());
  assert.equal(item.minName, 'Press');
  assert.equal(item.minSteps, 4);
  assert.equal(item.progress.completo, 4);
  assert.equal(item.progress.minimo, 4);
});

test('en v1 descarta overrides iguales al modo completo', () => {
  const item = normalizeItem({
    id: 'y', textCompleto: 'Press', textMinimo: 'Press',
    stepsCompleto: 3, stepsMinimo: 3,
    progress: { completo: 5, minimo: 5 }
  }, new Set());
  assert.equal(item.minName, null);
  assert.equal(item.minSteps, null);
  assert.equal(item.progress.completo, 3);
  assert.equal(item.progress.minimo, 3);
});

/* 2. Acciones sobre estado limpio */

resetStorage();
load();

test('agrega un grupo con nombre en el momento', () => {
  const gid = actions.addGroup('  Pecho  ');
  const day = getState().Lun;
  assert.ok(gid);
  assert.equal(day.groups.length, 1);
  assert.equal(day.groups[0].name, 'Pecho');
  assert.equal(day.groups[0].optional, false);
  assert.equal(JSON.parse(memory[STORAGE_KEY]).days.Lun.groups.length, 1);
});

const gid = getState().Lun.groups[0].id;

test('agrega un item por nombre con series por defecto', () => {
  const iid = actions.addItem(gid, '  Press banca  ');
  const item = getState().Lun.groups[0].items[0];
  assert.ok(iid);
  assert.equal(item.name, 'Press banca');
  assert.equal(item.steps, DEFAULT_STEPS);
  assert.equal(item.minName, null);
  assert.equal(item.minSteps, null);
  assert.equal(item.progress.completo, 0);
});

const iid = getState().Lun.groups[0].items[0].id;

test('usa el mismo nombre y las mismas series en ambos modos', () => {
  const item = getState().Lun.groups[0].items[0];
  assert.equal(getItemText(item, 'completo'), 'Press banca');
  assert.equal(getItemText(item, 'minimo'), 'Press banca');
  assert.equal(getSteps(item, 'completo'), DEFAULT_STEPS);
  assert.equal(getSteps(item, 'minimo'), DEFAULT_STEPS);
});

test('edita el nombre compartido y recorta el progreso al cambiar series', () => {
  actions.updateItemField(gid, iid, 'name', 'Press plano');
  actions.setStep(gid, iid, 2);
  actions.updateItemField(gid, iid, 'steps', '1');
  const item = getState().Lun.groups[0].items[0];
  assert.equal(item.name, 'Press plano');
  assert.equal(item.steps, 1);
  assert.equal(item.progress.completo, 1);
  assert.equal(getItemText(item, 'minimo'), 'Press plano');
});

test('ignora campos no editables', () => {
  const before = JSON.stringify(getState().Lun);
  actions.updateItemField(gid, iid, 'id', 'hackeado');
  assert.equal(JSON.stringify(getState().Lun), before);
});

test('limita la cantidad de series a un maximo razonable', () => {
  assert.equal(actions.updateItemField(gid, iid, 'steps', '500'), 100);
  assert.equal(getState().Lun.groups[0].items[0].steps, 100);
  assert.equal(actions.updateItemField(gid, iid, 'steps', '0'), 1);
  assert.equal(getState().Lun.groups[0].items[0].steps, 1);
});

test('activa el override de minimo con los valores actuales', () => {
  actions.updateItemField(gid, iid, 'steps', '4');
  actions.setMinOverride(gid, iid, true);
  const item = getState().Lun.groups[0].items[0];
  assert.equal(item.minName, 'Press plano');
  assert.equal(item.minSteps, 4);

  assert.equal(actions.updateItemField(gid, iid, 'minName', '   '), 'Press plano');
  assert.equal(item.minName, 'Press plano');
  actions.updateItemField(gid, iid, 'minName', 'Press inclinado');
  actions.updateItemField(gid, iid, 'minSteps', '2');
  assert.equal(getItemText(item, 'minimo'), 'Press inclinado');
  assert.equal(getSteps(item, 'minimo'), 2);
  assert.equal(getItemText(item, 'completo'), 'Press plano');
  assert.equal(getSteps(item, 'completo'), 4);
});

test('desactivar el override vuelve al modo compartido y recorta progreso', () => {
  actions.setMode('minimo');
  actions.setStep(gid, iid, 2);
  assert.equal(getState().Lun.groups[0].items[0].progress.minimo, 2);

  actions.updateItemField(gid, iid, 'steps', '1');
  actions.setMinOverride(gid, iid, false);
  const item = getState().Lun.groups[0].items[0];
  assert.equal(item.minName, null);
  assert.equal(item.minSteps, null);
  assert.equal(getItemText(item, 'minimo'), 'Press plano');
  assert.equal(getSteps(item, 'minimo'), 1);
  assert.equal(item.progress.minimo, 1);
});

test('los botones de series ajustan sin pasar de los limites', () => {
  actions.setMode('completo');
  actions.adjustItemSteps(gid, iid, 'steps', 1);
  assert.equal(getState().Lun.groups[0].items[0].steps, 2);
  actions.adjustItemSteps(gid, iid, 'steps', -5);
  assert.equal(getState().Lun.groups[0].items[0].steps, 1);
});

resetStorage();
load();

test('marca el dia como completado y registra historial', () => {
  const g = actions.addGroup('Test');
  const i = actions.addItem(g, 'Ejercicio');
  const today = getLocalISODate();
  actions.updateItemField(g, i, 'steps', '2');
  actions.setStep(g, i, 2);
  const day = getState().Lun;
  assert.equal(day.log.length, 1);
  assert.equal(day.log[0].date, today);
  assert.equal(day.log[0].status, 'full');
  assert.ok(isFinished(getState(), 'Lun', 'completo'));
});

test('no duplica el historial del mismo dia y modo', () => {
  const g = getState().Lun.groups[0];
  const i = g.items[0];
  actions.bumpStep(g.id, i.id);
  assert.equal(getState().Lun.log.filter(l => l.date === getLocalISODate() && l.mode === 'completo').length, 1);
});

test('el modo minimo ignora los grupos opcionales', () => {
  resetStorage();
  load();
  const main = actions.addGroup('Principal');
  const mainItem = actions.addItem(main, 'A');
  const optional = actions.addGroup('Opcional');
  const optionalItem = actions.addItem(optional, 'B');
  actions.setGroupOptional(optional, true);
  actions.updateItemField(main, mainItem, 'steps', '1');
  actions.updateItemField(optional, optionalItem, 'steps', '1');

  actions.setMode('minimo');
  actions.bumpStep(main, mainItem);
  assert.equal(isFinished(getState(), 'Lun', 'minimo'), true);
  assert.equal(isFinished(getState(), 'Lun', 'completo'), false);
});

test('reordena grupos e items con limites', () => {
  resetStorage();
  load();
  const g1 = actions.addGroup('Uno');
  const g2 = actions.addGroup('Dos');
  const i1 = actions.addItem(g1, 'A');
  const i2 = actions.addItem(g1, 'B');

  assert.equal(actions.moveItem(g1, i1, 1), true);
  assert.deepEqual(getState().Lun.groups[0].items.map(it => it.name), ['B', 'A']);
  assert.equal(actions.moveItem(g1, i1, -1), true);
  assert.deepEqual(getState().Lun.groups[0].items.map(it => it.name), ['A', 'B']);
  assert.equal(actions.moveItem(g1, i2, 1), false);

  assert.equal(actions.moveGroup(g1, 1), true);
  assert.deepEqual(getState().Lun.groups.map(g => g.name), ['Dos', 'Uno']);
  assert.equal(actions.moveGroup(g2, -1), false);
  assert.equal(actions.moveGroup(g1, -1), true);
  assert.deepEqual(getState().Lun.groups.map(g => g.name), ['Uno', 'Dos']);
});

test('duplica un item sin arrastrar el progreso', () => {
  resetStorage();
  load();
  const g = actions.addGroup('Pecho');
  const i = actions.addItem(g, 'Press');
  actions.updateItemField(g, i, 'steps', '4');
  actions.setMinOverride(g, i, true);
  actions.updateItemField(g, i, 'minName', 'Press inclinado');
  actions.updateItemField(g, i, 'minSteps', '2');
  actions.setStep(g, i, 1);

  const copyId = actions.duplicateItem(g, i);
  const items = getState().Lun.groups[0].items;
  assert.equal(items.length, 2);
  assert.equal(items[1].id, copyId);
  assert.notEqual(copyId, i);
  assert.equal(items[1].name, 'Press (copia)');
  assert.equal(items[1].steps, 4);
  assert.equal(items[1].minName, 'Press inclinado (copia)');
  assert.equal(items[1].minSteps, 2);
  assert.deepEqual(items[1].progress, { completo: 0, minimo: 0 });
  assert.equal(items[0].progress.completo, 1);
});

test('duplica un grupo con ids nuevos y checks limpios', () => {
  resetStorage();
  load();
  const g = actions.addGroup('Pecho');
  const i = actions.addItem(g, 'Press');
  actions.updateItemField(g, i, 'steps', '5');
  actions.setStep(g, i, 2);
  actions.setGroupOptional(g, true);

  const copyId = actions.duplicateGroup(g);
  const groups = getState().Lun.groups;
  const copy = groups[1];
  assert.equal(groups.length, 2);
  assert.equal(copy.id, copyId);
  assert.equal(copy.name, 'Pecho (copia)');
  assert.equal(copy.optional, true);
  assert.equal(copy.items.length, 1);
  assert.equal(copy.items[0].name, 'Press');
  assert.notEqual(copy.items[0].id, i);
  assert.equal(copy.items[0].steps, 5);
  assert.deepEqual(copy.items[0].progress, { completo: 0, minimo: 0 });
  assert.equal(groups[0].items[0].progress.completo, 2);
});

test('borra y restaura un grupo en su posicion', () => {
  resetStorage();
  load();
  const a = actions.addGroup('A');
  actions.addGroup('B');

  const snapshot = actions.deleteGroup(a);
  assert.ok(snapshot);
  assert.equal(snapshot.index, 0);
  assert.deepEqual(getState().Lun.groups.map(g => g.name), ['B']);
  assert.equal(actions.restoreGroup(snapshot), true);
  assert.deepEqual(getState().Lun.groups.map(g => g.name), ['A', 'B']);
  assert.equal(actions.restoreGroup(snapshot), false);
});

test('borra y restaura un item en su posicion', () => {
  resetStorage();
  load();
  const g = actions.addGroup('Grupo');
  const a = actions.addItem(g, 'A');
  const b = actions.addItem(g, 'B');

  const snapshot = actions.deleteItem(g, a);
  assert.ok(snapshot);
  assert.equal(snapshot.index, 0);
  assert.deepEqual(getState().Lun.groups[0].items.map(it => it.id), [b]);
  assert.equal(actions.restoreItem(snapshot), true);
  assert.deepEqual(getState().Lun.groups[0].items.map(it => it.id), [a, b]);
  assert.equal(actions.restoreItem(snapshot), false);
});

test('el reinicio actual limpia solo el modo en uso', () => {
  resetStorage();
  load();
  const g = actions.addGroup('Reset');
  const i = actions.addItem(g, 'Ejercicio');
  actions.updateItemField(g, i, 'steps', '2');
  actions.setStep(g, i, 1);
  actions.setMode('minimo');
  actions.setStep(g, i, 1);

  const result = actions.resetProgress();
  assert.equal(result.mode, 'minimo');
  assert.equal(getState().Lun.groups[0].items[0].progress.minimo, 0);
  assert.equal(getState().Lun.groups[0].items[0].progress.completo, 1);
});

test('el reinicio de ambos modos conserva el historial', () => {
  const g = getState().Lun.groups[0];
  const i = g.items[0];
  actions.setMode('completo');
  actions.setStep(g.id, i.id, 2);
  assert.equal(getState().Lun.log.length, 1);

  actions.resetProgress('both');
  assert.equal(getState().Lun.groups[0].items[0].progress.completo, 0);
  assert.equal(getState().Lun.groups[0].items[0].progress.minimo, 0);
  assert.equal(getState().Lun.log.length, 1);
});

test('el primer dia solo inicializa la fecha sin archivar', () => {
  resetStorage();
  load();
  actions.selectDay('Lun');
  const g = actions.addGroup('Inicio');
  actions.addItem(g, 'Press');
  getState().Lun.groups[0].items[0].progress.completo = 1;

  const result = rolloverDay(new Date(2026, 0, 6, 7));
  assert.equal(result.reason, 'initialized');
  assert.equal(result.archived, 0);
  assert.equal(getLastActiveDate(), '2026-01-06');
  assert.equal(getState().Lun.log.length, 0);
  assert.equal(getState().Lun.groups[0].items[0].progress.completo, 1);
});

test('archiva parciales y completos de varios dias una sola vez', () => {
  resetStorage();
  load();
  setLastActiveDate('2026-01-05');

  actions.selectDay('Lun');
  const lun = actions.addGroup('Pecho');
  const lunItem = actions.addItem(lun, 'Press');
  actions.updateItemField(lun, lunItem, 'steps', '3');
  getState().Lun.groups[0].items[0].progress.completo = 1;

  actions.selectDay('Mar');
  actions.setMode('minimo');
  const mar = actions.addGroup('Pierna');
  const marItem = actions.addItem(mar, 'Sentadilla');
  actions.updateItemField(mar, marItem, 'steps', '2');
  getState().Mar.groups[0].items[0].progress.minimo = 2;

  actions.selectDay('Mié');
  const mie = actions.addGroup('Espalda');
  const mieItem = actions.addItem(mie, 'Remo');
  actions.updateItemField(mie, mieItem, 'steps', '2');
  getState().Mié.groups[0].items[0].progress.completo = 2;

  const result = rolloverDay(new Date(2026, 0, 6, 7, 30));
  assert.equal(result.changed, true);
  assert.equal(result.archived, 3);
  assert.equal(result.from, '2026-01-05');
  assert.equal(result.to, '2026-01-06');
  assert.equal(getLastActiveDate(), '2026-01-06');

  const lunLog = getState().Lun.log[0];
  assert.equal(lunLog.date, '2026-01-05');
  assert.equal(lunLog.mode, 'completo');
  assert.equal(lunLog.status, 'partial');
  assert.equal(lunLog.items[0].done, false);

  const marLog = getState().Mar.log[0];
  assert.equal(marLog.date, '2026-01-05');
  assert.equal(marLog.mode, 'minimo');
  assert.equal(marLog.status, 'min');
  assert.equal(marLog.items[0].done, true);

  const mieLog = getState().Mié.log[0];
  assert.equal(mieLog.mode, 'completo');
  assert.equal(mieLog.status, 'full');

  ['Lun', 'Mar', 'Mié'].forEach(dayName => {
    getState()[dayName].groups.forEach(g => g.items.forEach(item => {
      assert.deepEqual(item.progress, { completo: 0, minimo: 0 });
    }));
  });

  const again = rolloverDay(new Date(2026, 0, 6, 12));
  assert.equal(again.changed, false);
  assert.equal(again.archived, 0);
  assert.equal(getState().Lun.log.length, 1);
  assert.equal(getState().Mar.log.length, 1);
  assert.equal(getState().Mié.log.length, 1);
});

test('no duplica una entrada que ya existe para la fecha y el modo', () => {
  resetStorage();
  load();
  setLastActiveDate('2026-01-05');

  actions.selectDay('Jue');
  const g = actions.addGroup('Brazo');
  const i = actions.addItem(g, 'Curl');
  actions.updateItemField(g, i, 'steps', '1');
  getState().Jue.groups[0].items[0].progress.completo = 1;
  getState().Jue.log.push({
    date: '2026-01-05',
    mode: 'completo',
    items: [{ text: 'Curl', done: true, group: 'Brazo' }],
    status: 'full'
  });

  const result = rolloverDay(new Date(2026, 0, 6, 8));
  assert.equal(result.changed, true);
  assert.equal(result.archived, 0);
  assert.equal(getState().Jue.log.length, 1);
  assert.equal(getState().Jue.groups[0].items[0].progress.completo, 0);
});

test('un dia sin progreso no genera entradas al reiniciar', () => {
  resetStorage();
  load();
  setLastActiveDate('2026-01-04');

  const result = rolloverDay(new Date(2026, 0, 6, 8));
  assert.equal(result.changed, true);
  assert.equal(result.archived, 0);
  assert.equal(getLastActiveDate(), '2026-01-06');
  DAYS.forEach(d => assert.equal(getState()[d].log.length, 0));
});

test('no reinicia ni archiva si la fecha sigue siendo hoy', () => {
  resetStorage();
  load();
  setLastActiveDate('2026-01-06');

  actions.selectDay('Lun');
  const g = actions.addGroup('Hoy');
  const i = actions.addItem(g, 'Press');
  actions.updateItemField(g, i, 'steps', '3');
  getState().Lun.groups[0].items[0].progress.completo = 1;

  const result = rolloverDay(new Date(2026, 0, 6, 23));
  assert.equal(result.changed, false);
  assert.equal(result.reason, 'same-day');
  assert.equal(result.archived, 0);
  assert.equal(getState().Lun.groups[0].items[0].progress.completo, 1);
  assert.equal(getState().Lun.log.length, 0);
});

test('save conserva el esquema versionado', () => {
  save();
  assert.equal(JSON.parse(memory[STORAGE_KEY]).schemaVersion, SCHEMA_VERSION);
});

/* 3. Estructura del editor */

resetStorage();
load();
actions.selectDay('Lun');
const uiGroup = actions.addGroup('Pecho');
actions.addItem(uiGroup, 'Press banca');
view.editMode = true;

test('el editor muestra ejercicio, series y minimo plegable', () => {
  const html = renderGroups('Lun');
  assert.ok(html.includes('Ejercicio'));
  assert.ok(html.includes('Series'));
  assert.ok(html.includes('Personalizar modo mínimo'));
  assert.ok(html.includes('data-form="add-item"'));
  assert.ok(html.includes('name="name"'));
  assert.ok(!html.includes('Series C'));
  assert.ok(!html.includes('textCompleto'));
});

test('el editor explica el modo minimo y el alta de grupo', () => {
  const html = renderGroups('Lun') + renderNotes('Lun');
  assert.ok(html.includes('Opcional'));
  assert.ok(html.toLowerCase().includes('se oculta en modo mínimo'));
  assert.ok(html.includes('Agregar grupo'));
  assert.ok(html.includes('calentar 10 minutos'));
});

test('el editor ofrece reordenar, duplicar y borrar directo', () => {
  view.editMode = true;
  const html = renderGroups('Lun');
  assert.ok(html.includes('data-action="move-group"'));
  assert.ok(html.includes('data-action="duplicate-group"'));
  assert.ok(html.includes('data-action="move-item"'));
  assert.ok(html.includes('data-action="duplicate-item"'));
  assert.ok(html.includes('aria-label="Mover Pecho arriba"'));
  assert.ok(html.includes('aria-label="Duplicar Press banca"'));
  assert.ok(!html.includes('Confirmar'));
});

test('la vista de uso muestra stepper y barra de progreso', () => {
  view.editMode = false;
  const html = renderGroups('Lun');
  assert.ok(html.includes('data-action="inc-step"'));
  assert.ok(html.includes('data-action="dec-step"'));
  assert.ok(html.includes('progress-track'));
  assert.ok(html.includes('0/3'));
});

test('el historial usa botones con fecha y estado accesibles', () => {
  const itemId = getState().Lun.groups[0].items[0].id;
  actions.setStep(uiGroup, itemId, 3);
  const html = renderHistory('Lun');
  const today = getLocalISODate();
  assert.ok(html.includes('<button type="button" class="hpoint full"'));
  assert.ok(html.includes(`aria-label="${today} · completo · modo completo"`));
  assert.ok(!html.includes('<div class="hpoint'));
});

test('agrupa el historial por mes y muestra los tres estados', () => {
  getState().Lun.log = [
    { date: '2026-02-04', mode: 'completo', items: [{ text: 'A', done: true, group: 'G' }], status: 'partial' },
    { date: '2026-01-05', mode: 'completo', items: [{ text: 'A', done: true, group: 'G' }], status: 'full' },
    { date: '2026-02-03', mode: 'minimo', items: [{ text: 'A', done: true, group: 'G' }], status: 'min' }
  ];
  const html = renderHistory('Lun');
  assert.ok(html.includes('Enero 2026'));
  assert.ok(html.includes('Febrero 2026'));
  assert.ok(html.includes('hpoint full'));
  assert.ok(html.includes('hpoint min'));
  assert.ok(html.includes('hpoint partial'));
  assert.ok(html.includes('aria-label="2026-02-04 · parcial · modo completo"'));
  assert.ok(html.indexOf('Enero 2026') < html.indexOf('Febrero 2026'));
});

/* 4. Respaldo */

const exportDate = new Date(2026, 0, 5, 15, 30);
const exportedText = JSON.stringify(buildExportPayload(getState(), exportDate));

test('exporta con app, version, fecha y nombre de archivo', () => {
  const payload = buildExportPayload(getState(), exportDate);
  assert.equal(payload.app, 'gymrutina');
  assert.equal(payload.schemaVersion, SCHEMA_VERSION);
  assert.equal(Object.keys(payload.days).length, 7);
  assert.equal(payload.exportedAt, exportDate.toISOString());
  assert.equal(suggestExportFilename(exportDate), 'gymrutina-2026-01-05.json');
});

test('resume dias con datos, grupos, items e historial', () => {
  const summary = summarizeDays(getState());
  const expectedGroups = Object.values(getState()).reduce((total, day) => total + day.groups.length, 0);
  const expectedItems = Object.values(getState()).reduce(
    (total, day) => total + day.groups.reduce((n, g) => n + g.items.length, 0), 0
  );
  assert.equal(summary.days, 7);
  assert.equal(summary.groups, expectedGroups);
  assert.equal(summary.items, expectedItems);
  assert.ok(summary.daysWithData >= 1);
});

test('reimporta un archivo exportado sin perder datos', () => {
  const parsed = parseImport(exportedText);
  assert.equal(parsed.version, SCHEMA_VERSION);
  assert.equal(parsed.summary.days, 7);
  assert.equal(parsed.days.Lun.groups.length, getState().Lun.groups.length);
  assert.equal(parsed.days.Lun.groups[0].items[0].name, getState().Lun.groups[0].items[0].name);
});

test('el seed de demo importa y cubre los tres estados', () => {
  const text = readFileSync(new URL('../seeds/gymrutina-demo.json', import.meta.url), 'utf8');
  const parsed = parseImport(text);

  assert.equal(parsed.version, 2);
  assert.equal(parsed.summary.days, 7);
  assert.ok(parsed.summary.groups >= 15);
  assert.ok(parsed.summary.items >= 35);
  assert.ok(parsed.summary.log >= 30);

  const statuses = new Set();
  for(const day of Object.values(parsed.days)){
    assert.ok(day.log.length >= 5, `${day.title} no tiene suficiente historial`);
    assert.equal(new Set(day.log.map(entry => entry.date.slice(0, 7))).size, 3, `${day.title} no cubre tres meses`);

    for(const entry of day.log){
      statuses.add(entry.status);
      const done = entry.items.filter(item => item.done).length;
      if(entry.status === 'partial'){
        assert.ok(done > 0, `${entry.date} no tiene progreso`);
        assert.ok(done < entry.items.length, `${entry.date} quedó completo`);
      } else {
        assert.equal(done, entry.items.length, `${entry.date} quedó incompleto`);
      }
    }
  }

  assert.deepEqual([...statuses].sort(), ['full', 'min', 'partial']);
});

test('importa un archivo v1 y lo migra en memoria', () => {
  const legacyDays = {};
  Object.entries(getState()).forEach(([name, day]) => {
    legacyDays[name] = {
      ...day,
      groups: day.groups.map(g => ({
        ...g,
        items: g.items.map(it => ({
          id: it.id,
          textCompleto: it.name,
          textMinimo: it.minName == null ? it.name : it.minName,
          stepsCompleto: it.steps,
          stepsMinimo: it.minSteps == null ? it.steps : it.minSteps,
          progress: it.progress
        }))
      }))
    };
  });
  const parsed = parseImport(JSON.stringify(legacyDays));
  const source = getState().Lun.groups[0].items[0];
  const item = parsed.days.Lun.groups[0].items[0];
  assert.equal(parsed.version, 1);
  assert.equal(item.name, source.name);
  assert.equal(item.steps, source.steps);
  assert.equal(parsed.summary.days, 7);
});

test('rechaza JSON roto, dias faltantes, basura y esquema futuro', () => {
  assert.throws(() => parseImport('{ roto'), /JSON/);
  assert.throws(() => parseImport(JSON.stringify({ Lun: {} })), /faltan/);
  assert.throws(() => parseImport(JSON.stringify({ hola: 1 })), /días/);
  assert.throws(
    () => parseImport(JSON.stringify({ schemaVersion: 99, days: getState() })),
    /esquema/
  );
});

test('reemplaza el estado y guarda una copia previa', () => {
  const before = getState().Lun.groups.length;
  const backupKey = backupCurrentState('test');
  assert.ok(backupKey);
  assert.ok(Object.prototype.hasOwnProperty.call(memory, backupKey));
  const { days } = parseImport(exportedText);
  replaceState(days);
  assert.equal(getState().Lun.groups.length, before);
  assert.equal(getPayload().schemaVersion, SCHEMA_VERSION);
});

test('avisa una vez si el navegador rechaza guardar', () => {
  let called = 0;
  onStorageError(() => { called++; });
  const originalSetItem = globalThis.localStorage.setItem;
  const originalWarn = console.warn;
  globalThis.localStorage.setItem = () => { throw new Error('cuota llena'); };
  console.warn = () => {};
  try {
    save();
    save();
  } finally {
    globalThis.localStorage.setItem = originalSetItem;
    console.warn = originalWarn;
  }
  assert.equal(called, 1);
});

/* 5. Utilidades del temporizador */

test('formatea segundos como MM:SS', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(9), '00:09');
  assert.equal(formatDuration(60), '01:00');
  assert.equal(formatDuration(125), '02:05');
  assert.equal(formatDuration(-5), '00:00');
});

test('calcula el restante desde la hora de fin', () => {
  const now = 1_000_000;
  assert.equal(remainingFromDeadline(now + 40_000, now), 40);
  assert.equal(remainingFromDeadline(now + 40_000, now + 1_001), 39);
  assert.equal(remainingFromDeadline(now, now + 5_000), 0);
});

console.log(`\n  ${passed} pruebas superadas.\n`);
if(process.exitCode) process.exit(process.exitCode);
