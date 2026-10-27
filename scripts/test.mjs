#!/usr/bin/env node
/**
 * test.mjs -- pruebas de estado, migración, sesiones, historial, respaldo y UI.
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
      get textContent(){ return text; },
      get innerHTML(){
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      },
      set innerHTML(value){ text = value == null ? '' : String(value); },
      className: '',
      dataset: {},
      setAttribute(){},
      appendChild(){},
      focus(){},
      remove(){}
    };
  }
};

const { LEGACY_STORAGE_KEY, STORAGE_KEY, LAST_ACTIVE_KEY, DAYS, DEFAULT_STEPS } = await import('../js/config.js');
const {
  load, getState, save, backupCurrentState, replaceState, getPayload,
  onStorageError, getLastActiveDate, setLastActiveDate
} = await import('../js/state/store.js');
const { SCHEMA_VERSION } = await import('../js/state/schema.js');
const {
  getItemText, getSteps, getSession, sessionStatus, sessionProgress,
  getCurrentStreak, getBestStreak
} = await import('../js/state/selectors.js');
const { normalizeItem, normalizePayload } = await import('../js/state/normalize.js');
const { view } = await import('../js/state/view.js');
const { renderEditorGroups, renderNotes, renderSessionGroups, renderTemplatePreview } = await import('../js/ui/groups.js');
const { renderHistory } = await import('../js/ui/history.js');
const {
  getLocalISODate, addDaysISO, getWeekStartISO, getWeekDates, getDayNameFromISODate,
  formatWeekRange, parseLocalISODate
} = await import('../js/utils/date.js');
const { formatDuration, remainingFromDeadline } = await import('../js/utils/time.js');
const { buildExportPayload, parseImport, suggestExportFilename, summarizeState } = await import('../js/features/backup.js');
const actions = await import('../js/features/actions.js');

let passed = 0;
function test(name, fn){
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch(e){
    console.error(`  x   ${name}`);
    console.error(`      ${e.stack || e.message}`);
    process.exitCode = 1;
  }
}

function resetStorage(){
  Object.keys(memory).forEach(k => delete memory[k]);
}

function resetApp(){
  resetStorage();
  view.screen = 'today';
  view.todayDate = getLocalISODate();
  view.selectedDate = view.todayDate;
  view.editorDay = 'Lun';
  view.historySelectedDate = '';
  view.historyEditDate = '';
  view.historyVisibleWeeks = 8;
  view.draftModes = {};
  load();
}

function editDay(day = 'Lun'){
  view.screen = 'editor';
  view.editorDay = day;
}

function sessionFor(date, { mode = 'completo', done = 2, steps = 2, text = 'Ejercicio' } = {}){
  return {
    date,
    day: getDayNameFromISODate(date),
    mode,
    groups: [{
      id: 'g-test',
      name: 'Grupo',
      optional: false,
      items: [{ id: 'i-test', text, steps, done }]
    }]
  };
}

function addTemplateSession(dayName, steps = 2){
  editDay(dayName);
  const gid = actions.addGroup('Grupo');
  const iid = actions.addItem(gid, 'Ejercicio');
  actions.updateItemField(gid, iid, 'steps', String(steps));
  return { gid, iid };
}

/* 1. Migración v1/v2 -> v3 */

resetStorage();
memory[LAST_ACTIVE_KEY] = '2026-01-06';
memory[LEGACY_STORAGE_KEY] = JSON.stringify({
  Lun: {
    title: 'Lunes', mode: 'minimo', notes: 'nota',
    groups: [{
      id: 'g1', name: 'Pecho', items: [
        { id: 'i1', textCompleto: 'Press', textMinimo: 'Press M', stepsCompleto: '4', stepsMinimo: 2, progress: { completo: 9, minimo: 1 } },
        { id: 'i1', textCompleto: 'Dup', textMinimo: 'Dup', stepsCompleto: 0, progress: { completo: 1 } }
      ]
    }],
    log: [
      { date: '2026-01-05', mode: 'completo', items: [{ text: 'Press', done: true, group: 'Pecho' }], status: 'full' },
      { date: '2026-01-05', mode: 'minimo', items: [{ text: 'Press M', done: true, group: 'Pecho' }], status: 'min' },
      { date: 'mal' }
    ]
  },
  Mar: {
    title: 'Martes', mode: 'completo', notes: '',
    groups: [{
      id: 'g2', name: 'Pierna', items: [
        { id: 'i2', name: 'Sentadilla', steps: 3, minName: null, minSteps: null, progress: { completo: 1, minimo: 0 } }
      ]
    }],
    log: []
  }
});

const migrated = load();

test('migra a v3 con plantilla y sesiones', () => {
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(SCHEMA_VERSION, 3);
  assert.equal(Object.keys(migrated.template).length, 7);
  assert.ok(migrated.template.Lun && migrated.template.Dom);
  assert.equal(migrated.template.Lun.title, 'Lunes');
  assert.equal(migrated.template.Lun.defaultMode, 'minimo');
});

test('la plantilla v3 no conserva progreso ni log', () => {
  const item = migrated.template.Lun.groups[0].items[0];
  assert.equal(item.name, 'Press');
  assert.equal(item.steps, 4);
  assert.equal(item.minName, 'Press M');
  assert.equal(item.minSteps, 2);
  assert.equal('progress' in item, false);
  assert.equal('log' in migrated.template.Lun, false);
});

test('convierte logs en sesiones con series completas', () => {
  const session = migrated.sessions['2026-01-05'];
  assert.ok(session);
  assert.equal(session.mode, 'completo');
  assert.equal(sessionStatus(session), 'full');
  const row = session.groups[0].items[0];
  assert.equal(row.text, 'Press');
  assert.equal(row.steps, 4);
  assert.equal(row.done, 4);
});

test('colapsa duplicados por fecha con prioridad full > min > partial', () => {
  const sessions = normalizePayload({
    schemaVersion: 3,
    template: migrated.template,
    sessions: {
      '2026-02-01': sessionFor('2026-02-01', { mode: 'minimo', done: 2 }),
      '2026-02-02': sessionFor('2026-02-02', { mode: 'completo', done: 1 }),
      '2026-02-02b': sessionFor('2026-02-02', { mode: 'minimo', done: 2 })
    }
  }).sessions;
  assert.equal(sessionStatus(sessions['2026-02-01']), 'min');
  assert.equal(sessionStatus(sessions['2026-02-02']), 'min');
});

test('migra el progreso de la última fecha activa como sesión', () => {
  const session = migrated.sessions['2026-01-06'];
  assert.ok(session);
  assert.equal(session.day, 'Mar');
  assert.equal(session.mode, 'completo');
  assert.equal(sessionStatus(session), 'partial');
  assert.equal(session.groups[0].items[0].done, 1);
});

test('guarda una copia cruda antes de migrar y persiste v3', () => {
  const backupKey = Object.keys(memory).find(k => k.startsWith(`${LEGACY_STORAGE_KEY}_backup_pre_v3_`));
  assert.ok(backupKey);
  assert.equal(JSON.parse(memory[backupKey]).Lun.notes, 'nota');
  const saved = JSON.parse(memory[STORAGE_KEY]);
  assert.equal(saved.schemaVersion, 3);
  assert.ok(saved.template && saved.sessions);
  assert.equal('days' in saved, false);
});

test('normaliza v2 sin apagar un override explícito', () => {
  const item = normalizeItem({
    id: 'x', name: 'Press', steps: 4, minName: 'Press', minSteps: 4,
    progress: { completo: 9, minimo: 9 }
  }, new Set());
  assert.equal(item.minName, 'Press');
  assert.equal(item.minSteps, 4);
  assert.equal(item.progress.completo, 4);
  assert.equal(item.progress.minimo, 4);
});

/* 2. Acciones de plantilla */

resetApp();

test('agrega grupos y ejercicios a la plantilla', () => {
  const gid = actions.addGroup('  Pecho  ');
  const iid = actions.addItem(gid, '  Press banca  ');
  const day = getState().template.Lun;
  assert.ok(gid && iid);
  assert.equal(day.groups.length, 1);
  assert.equal(day.groups[0].name, 'Pecho');
  assert.equal(day.groups[0].optional, false);
  assert.equal(day.groups[0].items[0].name, 'Press banca');
  assert.equal(day.groups[0].items[0].steps, DEFAULT_STEPS);
  assert.equal('progress' in day.groups[0].items[0], false);
  assert.equal(JSON.parse(memory[STORAGE_KEY]).template.Lun.groups.length, 1);
});

const gid = getState().template.Lun.groups[0].id;
const iid = getState().template.Lun.groups[0].items[0].id;

test('edita nombre, series y overrides de mínimo', () => {
  actions.updateItemField(gid, iid, 'name', 'Press plano');
  actions.updateItemField(gid, iid, 'steps', '4');
  actions.setMinOverride(gid, iid, true);
  const item = getState().template.Lun.groups[0].items[0];
  assert.equal(item.name, 'Press plano');
  assert.equal(item.steps, 4);
  assert.equal(item.minName, 'Press plano');
  assert.equal(item.minSteps, 4);

  actions.updateItemField(gid, iid, 'minName', 'Press inclinado');
  actions.updateItemField(gid, iid, 'minSteps', '2');
  assert.equal(getItemText(item, 'completo'), 'Press plano');
  assert.equal(getItemText(item, 'minimo'), 'Press inclinado');
  assert.equal(getSteps(item, 'minimo'), 2);
});

test('limita series e ignora campos no editables', () => {
  assert.equal(actions.updateItemField(gid, iid, 'steps', '500'), 100);
  assert.equal(actions.updateItemField(gid, iid, 'steps', '0'), 1);
  const before = JSON.stringify(getState().template.Lun);
  actions.updateItemField(gid, iid, 'id', 'hackeado');
  assert.equal(JSON.stringify(getState().template.Lun), before);
});

test('reordena, duplica y restaura sin arrastrar checks', () => {
  resetApp();
  editDay('Lun');
  const g1 = actions.addGroup('Uno');
  const g2 = actions.addGroup('Dos');
  const i1 = actions.addItem(g1, 'A');
  const i2 = actions.addItem(g1, 'B');

  assert.equal(actions.moveItem(g1, i1, 1), true);
  assert.deepEqual(getState().template.Lun.groups[0].items.map(it => it.name), ['B', 'A']);
  assert.equal(actions.moveItem(g1, i1, 1), false);
  assert.equal(actions.moveGroup(g1, 1), true);
  assert.deepEqual(getState().template.Lun.groups.map(g => g.name), ['Dos', 'Uno']);

  const copyId = actions.duplicateItem(g1, i1);
  const copy = getState().template.Lun.groups[1].items.find(it => it.id === copyId);
  assert.equal(copy.name, 'A (copia)');
  assert.equal('progress' in copy, false);

  const groupSnapshot = actions.deleteGroup(g2);
  assert.equal(getState().template.Lun.groups.some(g => g.id === g2), false);
  assert.equal(actions.restoreGroup(groupSnapshot), true);
  assert.deepEqual(getState().template.Lun.groups.map(g => g.name), ['Dos', 'Uno']);

  const itemSnapshot = actions.deleteItem(g1, i1);
  assert.equal(actions.restoreItem(itemSnapshot), true);
  assert.equal(getState().template.Lun.groups[1].items.some(it => it.id === i1), true);
});

/* 3. Sesiones por fecha */

resetApp();
const today = getLocalISODate();
view.screen = 'today';
view.selectedDate = today;
const created = addTemplateSession('Lun', 2);
const sid = created;
view.screen = 'today';

test('marcar hoy crea una única sesión de la fecha', () => {
  assert.equal(actions.setStep(today, sid.gid, sid.iid, 1), true);
  assert.equal(Object.keys(getState().sessions).length, 1);
  let session = getSession(getState(), today);
  assert.equal(session.date, today);
  assert.equal(session.day, getDayNameFromISODate(today));
  assert.equal(session.mode, 'completo');
  assert.equal(sessionStatus(session), 'partial');

  actions.setStep(today, sid.gid, sid.iid, 2);
  session = getSession(getState(), today);
  assert.equal(sessionStatus(session), 'full');
  assert.equal(Object.keys(getState().sessions).length, 1);
});

test('solo hoy permite marcar sin habilitar historial', () => {
  const lastWeek = addDaysISO(today, -7);
  const future = addDaysISO(today, 1);
  assert.equal(actions.setStep(lastWeek, sid.gid, sid.iid, 1), false);
  assert.equal(getSession(getState(), lastWeek), null);
  assert.equal(actions.setStep(future, sid.gid, sid.iid, 1), false);
  assert.equal(getSession(getState(), future), null);
  assert.equal(actions.setStep(lastWeek, sid.gid, sid.iid, 1, true), true);
  assert.equal(sessionStatus(getSession(getState(), lastWeek)), 'partial');
});

test('cambiar de modo con checks pide confirmación y reinicia', () => {
  resetApp();
  const { gid: g, iid: i } = addTemplateSession('Lun', 2);
  view.screen = 'today';
  actions.setStep(today, g, i, 1);

  const blocked = actions.setSessionMode(today, 'minimo', false, false);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.needsReset, true);
  assert.equal(getSession(getState(), today).mode, 'completo');

  const forced = actions.setSessionMode(today, 'minimo', true, false);
  assert.equal(forced.ok, true);
  assert.equal(getSession(getState(), today), null);
  assert.equal(view.draftModes[today], 'minimo');

  actions.setStep(today, g, i, 1);
  assert.equal(getSession(getState(), today).mode, 'minimo');
});

test('reset borra la sesión y conserva el modo elegido', () => {
  assert.equal(actions.resetDateSession(today, false), true);
  assert.equal(getSession(getState(), today), null);
  assert.equal(view.draftModes[today], 'minimo');
  assert.equal(actions.resetDateSession(today, false), false);
});

test('editar la plantilla no altera una sesión ya guardada', () => {
  resetApp();
  const { gid: g, iid: i } = addTemplateSession('Lun', 3);
  view.screen = 'today';
  actions.setStep(today, g, i, 2);
  const before = JSON.parse(JSON.stringify(getSession(getState(), today)));

  editDay('Lun');
  actions.updateItemField(g, i, 'name', 'Nombre nuevo');
  actions.updateItemField(g, i, 'steps', '5');
  assert.deepEqual(getSession(getState(), today), before);
  assert.equal(getState().template.Lun.groups[0].items[0].name, 'Nombre nuevo');
});

test('el modo mínimo excluye los grupos opcionales al crear la sesión', () => {
  resetApp();
  editDay('Lun');
  const main = actions.addGroup('Principal');
  const mainItem = actions.addItem(main, 'A');
  const optional = actions.addGroup('Opcional');
  const optionalItem = actions.addItem(optional, 'B');
  actions.setGroupOptional(optional, true);
  actions.updateItemField(main, mainItem, 'steps', '1');
  actions.updateItemField(optional, optionalItem, 'steps', '1');

  view.screen = 'today';
  actions.setSessionMode(today, 'minimo', false, false);
  actions.setStep(today, main, mainItem, 1);
  const session = getSession(getState(), today);
  assert.equal(session.mode, 'minimo');
  assert.equal(session.groups.length, 1);
  assert.equal(session.groups[0].name, 'Principal');
  assert.equal(sessionStatus(session), 'min');
});

/* 4. Racha */

resetApp();

test('la racha espera si hoy está pendiente y cuenta días consecutivos', () => {
  const sessions = {
    [addDaysISO(today, -1)]: sessionFor(addDaysISO(today, -1), { mode: 'completo', done: 2 }),
    [addDaysISO(today, -2)]: sessionFor(addDaysISO(today, -2), { mode: 'minimo', done: 2 })
  };
  assert.equal(getCurrentStreak(sessions, today), 2);
  sessions[today] = sessionFor(today, { mode: 'completo', done: 2 });
  assert.equal(getCurrentStreak(sessions, today), 3);
  sessions[today] = sessionFor(today, { mode: 'completo', done: 1 });
  assert.equal(getCurrentStreak(sessions, today), 2);
});

test('un día vacío o parcial corta la racha y se calcula la mejor', () => {
  const sessions = {
    '2026-01-01': sessionFor('2026-01-01', { done: 2 }),
    '2026-01-02': sessionFor('2026-01-02', { done: 2 }),
    '2026-01-03': sessionFor('2026-01-03', { done: 1 }),
    '2026-01-04': sessionFor('2026-01-04', { done: 2 }),
    '2026-01-05': sessionFor('2026-01-05', { done: 2 })
  };
  assert.equal(getBestStreak(sessions), 2);
  assert.equal(getCurrentStreak(sessions, '2026-01-06'), 2);
  assert.equal(getCurrentStreak(sessions, '2026-01-03'), 2);
  const withFuture = { ...sessions, [addDaysISO(today, 1)]: sessionFor(addDaysISO(today, 1), { done: 2 }) };
  assert.equal(getBestStreak(withFuture, today), 2);
});

/* 5. Render de editor, sesión e historial */

resetApp();
editDay('Lun');
const uiGroup = actions.addGroup('Pecho');
const uiItem = actions.addItem(uiGroup, 'Press banca');
actions.updateItemField(uiGroup, uiItem, 'steps', '3');

test('el editor muestra campos, mínimo plegable y alta rápida', () => {
  const day = getState().template.Lun;
  const html = renderEditorGroups(day) + renderNotes(day, true);
  assert.ok(html.includes('Ejercicio'));
  assert.ok(html.includes('Series'));
  assert.ok(html.includes('Personalizar modo mínimo'));
  assert.ok(html.includes('data-form="add-item"'));
  assert.ok(html.includes('data-form="add-group"'));
  assert.ok(html.includes('Opcional'));
  assert.ok(html.includes('data-action="move-group"'));
  assert.ok(html.includes('data-action="duplicate-item"'));
  assert.ok(html.includes('calentar 10 minutos'));
});

test('la sesión editable usa acciones con fecha y la de sólo lectura no', () => {
  const session = sessionFor(today, { done: 1, steps: 3 });
  const editable = renderSessionGroups(session, { editable: true, date: today, allowPast: false });
  assert.ok(editable.includes('data-action="session-inc"'));
  assert.ok(editable.includes('data-action="session-dec"'));
  assert.ok(editable.includes(`data-date="${today}"`));
  assert.ok(editable.includes('1/3'));
  assert.ok(editable.includes('progress-track'));

  const readOnly = renderSessionGroups(session, { editable: false, date: today });
  assert.ok(!readOnly.includes('data-action="session-inc"'));
  assert.ok(readOnly.includes('1/3'));
});

test('la vista previa de un día futuro muestra series sin checks', () => {
  const html = renderTemplatePreview(getState().template.Lun, 'completo');
  assert.ok(html.includes('Press banca'));
  assert.ok(html.includes('3 series'));
  assert.ok(!html.includes('data-action="session-inc"'));
});

test('el historial muestra 7 días por semana, racha y detalle', () => {
  resetApp();
  const past = addDaysISO(getWeekStartISO(getLocalISODate()), -7);
  getState().sessions[past] = sessionFor(past, { done: 2, steps: 2 });
  view.screen = 'history';
  view.historySelectedDate = past;
  view.historyEditDate = '';
  view.historyVisibleWeeks = 8;

  const html = renderHistory();
  assert.ok(html.includes('Racha actual'));
  assert.ok(html.includes('Mejor racha'));
  assert.ok(html.includes(formatWeekRange(getWeekStartISO(getLocalISODate()))));
  assert.equal((html.match(/class="day-cell/g) || []).length >= 7, true);
  assert.ok(html.includes('data-action="history-select-date"'));
  assert.ok(html.includes('Editar sesión'));
  assert.ok(html.includes('Completo'));
});

test('el historial permite registrar un día pasado vacío', () => {
  resetApp();
  const past = addDaysISO(getLocalISODate(), -2);
  view.screen = 'history';
  view.historySelectedDate = past;
  view.historyEditDate = '';
  view.historyVisibleWeeks = 8;
  const html = renderHistory();
  assert.ok(html.includes('Sin registro'));
  assert.ok(html.includes('Registrar este día'));
});

test('el detalle de edición usa la sesión guardada o la plantilla', () => {
  resetApp();
  const past = addDaysISO(getLocalISODate(), -7);
  editDay(getDayNameFromISODate(past));
  const g = actions.addGroup('Pecho');
  const i = actions.addItem(g, 'Press');
  actions.updateItemField(g, i, 'steps', '2');
  view.screen = 'history';
  view.historySelectedDate = past;
  view.historyEditDate = past;
  view.historyVisibleWeeks = 8;

  const html = renderHistory();
  assert.ok(html.includes('Nuevo registro'));
  assert.ok(html.includes('data-action="session-inc"'));
  assert.ok(html.includes('data-past="1"'));
  assert.ok(html.includes('data-action="history-edit-done"'));
});

test('Historial no edita hoy y el editor sigue el día visible', () => {
  resetApp();
  assert.equal(actions.beginHistoryEdit(today), false);
  const past = addDaysISO(today, -1);
  assert.equal(actions.beginHistoryEdit(past), true);
  view.screen = 'history';
  view.historySelectedDate = past;
  actions.startEditing();
  assert.equal(view.screen, 'editor');
  assert.equal(view.editorDay, getDayNameFromISODate(past));
});

/* 6. Respaldo v3 y compatibilidad */

resetApp();
const today2 = getLocalISODate();
const todayDay = getDayNameFromISODate(today2);
editDay(todayDay);
const bg = actions.addGroup('Espalda');
const bi = actions.addItem(bg, 'Remo');
actions.updateItemField(bg, bi, 'steps', '2');
view.screen = 'today';
actions.setStep(today2, bg, bi, 2);

const exportDate = new Date(2026, 0, 5, 15, 30);
const exportedText = JSON.stringify(buildExportPayload(getState(), exportDate));

test('exporta v3 con plantilla y sesiones', () => {
  const payload = buildExportPayload(getState(), exportDate);
  assert.equal(payload.app, 'gymrutina');
  assert.equal(payload.schemaVersion, 3);
  assert.equal(Object.keys(payload.template).length, 7);
  assert.ok(payload.sessions[today2]);
  assert.equal(payload.exportedAt, exportDate.toISOString());
  assert.equal(suggestExportFilename(exportDate), 'gymrutina-2026-01-05.json');
});

test('resume plantilla, sesiones y estados', () => {
  const summary = summarizeState(getState());
  assert.equal(summary.days, 7);
  assert.ok(summary.groups >= 1);
  assert.ok(summary.items >= 1);
  assert.equal(summary.sessions, 1);
  assert.equal(summary.completed, 1);
});

test('reimporta un archivo exportado sin perder datos', () => {
  const parsed = parseImport(exportedText);
  assert.equal(parsed.version, 3);
  assert.equal(parsed.summary.days, 7);
  assert.equal(parsed.state.template[todayDay].groups.length, getState().template[todayDay].groups.length);
  assert.ok(parsed.state.sessions[today2]);
});

test('importa la semilla v3 con tres estados', () => {
  const text = readFileSync(new URL('../seeds/gymrutina-demo.json', import.meta.url), 'utf8');
  const parsed = parseImport(text);
  assert.equal(parsed.version, 3);
  assert.equal(parsed.summary.days, 7);
  assert.ok(parsed.summary.groups >= 15);
  assert.ok(parsed.summary.items >= 35);
  assert.ok(parsed.summary.sessions >= 30);

  const statuses = new Set();
  Object.values(parsed.state.sessions).forEach(session => {
    statuses.add(sessionStatus(session));
  });
  assert.deepEqual([...statuses].sort(), ['full', 'min', 'partial']);
});

test('importa la semilla v2 anterior y conserva sus 37 registros', () => {
  const text = readFileSync(new URL('../seeds/gymrutina-demo-v2.json', import.meta.url), 'utf8');
  const raw = JSON.parse(text);
  const parsed = parseImport(text);
  const logDates = Object.values(raw.days).flatMap(day => (day.log || []).map(entry => entry.date));

  assert.equal(parsed.version, 2);
  assert.equal(parsed.state.schemaVersion, 3);
  assert.equal(logDates.length, 37);
  assert.ok(parsed.summary.sessions >= 37);
  logDates.forEach(date => assert.ok(parsed.state.sessions[date], date));
  assert.equal(parsed.state.template.Lun.groups.length, 3);
});

test('importa un archivo v2 y lo migra a sesiones', () => {
  const days = {};
  DAYS.forEach(day => {
    days[day] = {
      title: day, mode: 'completo', notes: '',
      groups: [{ id: `${day}-g`, name: 'Grupo', items: [{ id: `${day}-i`, name: 'Ejercicio', steps: 2, minName: null, minSteps: null, progress: { completo: 0, minimo: 0 } }] }],
      log: []
    };
  });
  days.Lun.log.push({
    date: '2026-03-02', mode: 'completo',
    items: [{ text: 'Ejercicio', done: true, group: 'Grupo' }], status: 'full'
  });
  const parsed = parseImport(JSON.stringify({ schemaVersion: 2, days }));
  assert.equal(parsed.version, 2);
  assert.equal(parsed.state.schemaVersion, 3);
  assert.equal(sessionStatus(parsed.state.sessions['2026-03-02']), 'full');
});

test('rechaza JSON roto, días faltantes, basura y esquema futuro', () => {
  assert.throws(() => parseImport('{ roto'), /JSON/);
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 3, template: { Lun: {} }, sessions: {} })), /faltan/);
  assert.throws(() => parseImport(JSON.stringify({ hola: 1 })), /días/);
  assert.throws(
    () => parseImport(JSON.stringify({ schemaVersion: 99, template: getState().template, sessions: {} })),
    /esquema/
  );
});

test('reemplaza el estado y guarda una copia previa', () => {
  const before = getState().template.Mar.groups.length;
  const backupKey = backupCurrentState('test');
  assert.ok(backupKey);
  assert.ok(Object.prototype.hasOwnProperty.call(memory, backupKey));
  const { state } = parseImport(exportedText);
  replaceState(state);
  assert.equal(getState().template.Mar.groups.length, before);
  assert.equal(getPayload().schemaVersion, SCHEMA_VERSION);
});

/* 7. Fechas, utilidades y almacenamiento */

test('calcula la semana de lunes a domingo y suma días locales', () => {
  const week = getWeekDates('2026-10-27');
  assert.equal(week.length, 7);
  assert.equal(week[0], '2026-10-26');
  assert.equal(week[6], '2026-11-01');
  assert.equal(getWeekStartISO('2026-10-27'), '2026-10-26');
  assert.equal(addDaysISO('2026-10-27', 5), '2026-11-01');
  assert.equal(parseLocalISODate('2026-10-27').getDate(), 27);
  assert.equal(parseLocalISODate('2026-02-31'), null);
  assert.ok(formatWeekRange('2026-10-26').includes('26'));
});

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

test('guarda una copia antes de normalizar un esquema futuro', () => {
  resetStorage();
  memory[STORAGE_KEY] = JSON.stringify({ schemaVersion: 99, template: {}, sessions: {} });
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    load();
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(getState().schemaVersion, SCHEMA_VERSION);
  assert.ok(Object.keys(memory).some(key => key.startsWith(`${STORAGE_KEY}_backup_future_v99_`)));
});

test('guarda el esquema v3', () => {
  save();
  assert.equal(JSON.parse(memory[STORAGE_KEY]).schemaVersion, SCHEMA_VERSION);
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

console.log(`\n  ${passed} pruebas superadas.\n`);
if(process.exitCode) process.exit(process.exitCode);
