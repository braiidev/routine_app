import { load, onChange, onStorageError, getState, replaceState } from './state/store.js';
import { view } from './state/view.js';
import { icon } from './icons.js';
import { render } from './ui/render.js';
import { initMenu, closeMenu, RESET_LABEL } from './ui/menu.js';
import { openHistoryDateSheet } from './ui/history.js';
import { exportRoutine, importRoutineFile } from './ui/backup.js';
import { openResetSheet } from './ui/reset.js';
import { showToast } from './ui/toast.js';
import { initTimer } from './features/timer.js';
import { formatDateLong } from './utils/date.js';
import { syncToday } from './state/view.js';
import * as actions from './features/actions.js';
import { STORAGE_KEY } from './config.js';

function showUndo(message, restore){
  showToast(message, {
    actionLabel: 'Deshacer',
    duration: 5000,
    onAction: () => {
      if(restore()) showToast('Restaurado', { duration: 1600 });
      else showToast('No se pudo restaurar', { error: true });
    }
  });
}

function allowPast(ds){
  return ds.past === '1';
}

const CLICK_ACTIONS = {
  'nav-today': () => actions.goToday(),
  'nav-history': () => actions.goHistory(),
  'select-date': (ds) => actions.selectDate(ds.date),
  'select-editor-day': (ds) => actions.selectEditorDay(ds.day),
  'start-editor': (ds) => actions.startEditing(ds.day, ds.date),
  'stop-editor': () => {
    actions.stopEditing();
    showToast('Cambios guardados', { duration: 1600 });
  },
  'set-default-mode': (ds) => actions.setDefaultMode(ds.mode),
  'session-mode': (ds) => {
    if(!ds.date || !ds.mode) return;
    const past = allowPast(ds);
    let result = actions.setSessionMode(ds.date, ds.mode, false, past);
    if(result.needsReset){
      const ok = window.confirm('Cambiar de modo reinicia la sesión de este día. Si estaba completa, también puede cambiar el historial y la racha.\n\n¿Continuar?');
      if(!ok) return;
      result = actions.setSessionMode(ds.date, ds.mode, true, past);
    }
    if(!result.ok && result.reason === 'locked'){
      showToast('Solo podés marcar la sesión de hoy', { duration: 2400 });
    }
  },
  'session-step': (ds) => actions.setStep(ds.date, ds.group, ds.item, Number(ds.step), allowPast(ds)),
  'session-bump': (ds) => actions.bumpStep(ds.date, ds.group, ds.item, allowPast(ds)),
  'session-inc': (ds) => actions.adjustStep(ds.date, ds.group, ds.item, 1, allowPast(ds)),
  'session-dec': (ds) => actions.adjustStep(ds.date, ds.group, ds.item, -1, allowPast(ds)),
  'history-select-date': (ds) => actions.selectHistoryDate(ds.date),
  'history-register': (ds) => actions.beginHistoryEdit(ds.date),
  'history-edit': (ds) => actions.beginHistoryEdit(ds.date),
  'history-edit-done': () => actions.endHistoryEdit(),
  'history-more': () => actions.showMoreWeeks(),
  'history-date-sheet': () => openHistoryDateSheet(),
  'move-group': (ds) => actions.moveGroup(ds.group, Number(ds.delta)),
  'move-item': (ds) => actions.moveItem(ds.group, ds.item, Number(ds.delta)),
  'duplicate-group': (ds) => actions.duplicateGroup(ds.group),
  'duplicate-item': (ds) => actions.duplicateItem(ds.group, ds.item),
  'delete-group': (ds) => {
    const snapshot = actions.deleteGroup(ds.group);
    if(snapshot) showUndo('Grupo eliminado', () => actions.restoreGroup(snapshot));
  },
  'delete-item': (ds) => {
    const snapshot = actions.deleteItem(ds.group, ds.item);
    if(snapshot) showUndo('Ejercicio eliminado', () => actions.restoreItem(snapshot));
  },
  'adjust-item-steps': (ds) => actions.adjustItemSteps(ds.group, ds.item, ds.field, Number(ds.delta))
};

const CHANGE_ACTIONS = {
  'title': (el) => actions.updateTitle(el.value),
  'notes': (el) => actions.updateNotes(el.value),
  'group-name': (el, ds) => actions.updateGroupName(ds.group, el.value),
  'group-optional': (el, ds) => actions.setGroupOptional(ds.group, el.checked),
  'item-field': (el, ds) => {
    const value = actions.updateItemField(ds.group, ds.item, ds.field, el.value);
    if(value !== undefined && (ds.field === 'steps' || ds.field === 'minSteps' || ds.field === 'minName')) el.value = value;
  },
  'item-min-override': (el, ds) => actions.setMinOverride(ds.group, ds.item, el.checked)
};

function injectIcons(){
  document.getElementById('headerIcon').innerHTML = icon('barbell', 20) + ' GymRutina';
  document.getElementById('fabBtn').innerHTML = icon('menu', 22);
  document.getElementById('editMenuBtn').innerHTML = icon('edit', 18) + ' <span id="editLabel">Editar rutina</span>';
  document.getElementById('exportMenuBtn').innerHTML = icon('download', 18) + ' Exportar datos';
  document.getElementById('importMenuBtn').innerHTML = icon('upload', 18) + ' Importar datos';
  document.getElementById('resetMenuBtn').innerHTML = icon('refresh', 18) + ' ' + RESET_LABEL;
}

function bindMenuActions(){
  document.getElementById('editMenuBtn').onclick = () => {
    closeMenu();
    if(view.screen === 'editor'){
      actions.stopEditing();
      showToast('Cambios guardados', { duration: 1600 });
      return;
    }
    actions.startEditing();
  };

  document.getElementById('resetMenuBtn').onclick = () => {
    closeMenu();
    openResetSheet();
  };

  document.getElementById('exportMenuBtn').onclick = () => {
    closeMenu();
    exportRoutine();
  };

  const importInput = document.getElementById('importFile');
  document.getElementById('importMenuBtn').onclick = () => {
    closeMenu();
    importInput.click();
  };
  importInput.onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    await importRoutineFile(file);
  };
}

function focusItemAdd(groupId){
  const form = Array.from(document.querySelectorAll('[data-form="add-item"]'))
    .find(f => f.dataset.group === groupId);
  const input = form && form.querySelector('input[name="name"]');
  if(input) input.focus();
}

function bindDelegation(){
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const handler = CLICK_ACTIONS[el.dataset.action];
    if(handler) handler(el.dataset);
  });

  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-edit]');
    if(!el) return;
    const handler = CHANGE_ACTIONS[el.dataset.edit];
    if(handler) handler(el, el.dataset);
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && e.target.matches('input[data-edit]')){
      e.preventDefault();
      e.target.blur();
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]');
    if(!form) return;
    e.preventDefault();

    const input = form.querySelector('input[name="name"]');
    const name = (input && input.value ? input.value : '').trim();
    if(!name){
      if(input) input.focus();
      return;
    }

    if(form.dataset.form === 'add-group'){
      const groupId = actions.addGroup(name);
      focusItemAdd(groupId);
    } else if(form.dataset.form === 'add-item'){
      const groupId = form.dataset.group;
      actions.addItem(groupId, name);
      focusItemAdd(groupId);
    }
  });
}

function bindDayChange(){
  const check = () => {
    if(!syncToday()) return;
    render();
    showToast(`Nuevo día: ${formatDateLong(view.todayDate)}`, { duration: 2800 });
  };
  document.addEventListener('visibilitychange', () => {
    if(!document.hidden) check();
  });
  window.addEventListener('pageshow', check);
  window.addEventListener('focus', check);
}

function boot(){
  onStorageError((info) => {
    if(info && info.quota){
      showToast('No se puede guardar. El almacenamiento está lleno.', {
        error: true,
        duration: 8000,
        actionLabel: 'Exportar datos',
        onAction: () => {
          closeMenu();
          exportRoutine();
        }
      });
      return;
    }
    showToast('No se pudo guardar en el navegador. Los cambios quedan solo en memoria.', {
      error: true,
      duration: 6000
    });
  });
  load();
  onChange(render);
  window.addEventListener('storage', (e) => {
    if(e.key !== STORAGE_KEY) return;
    try {
      if(!e.newValue) return;
      const raw = JSON.parse(e.newValue);
      replaceState(raw);
      syncToday();
      render();
      showToast('Datos actualizados desde otra pestaña', { duration: 2000 });
    } catch(err) {
      // ignore
    }
  });
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
  injectIcons();
  initMenu();
  bindMenuActions();
  bindDelegation();
  bindDayChange();
  initTimer();
  render();
}

boot();
