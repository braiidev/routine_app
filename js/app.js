import { load, onChange, onStorageError } from './state/store.js';
import { view } from './state/view.js';
import { icon } from './icons.js';
import { render } from './ui/render.js';
import { initMenu, closeMenu, RESET_LABEL } from './ui/menu.js';
import { showHistDetail } from './ui/history.js';
import { exportRoutine, importRoutineFile } from './ui/backup.js';
import { openResetSheet } from './ui/reset.js';
import { showToast } from './ui/toast.js';
import { initTimer } from './features/timer.js';
import * as actions from './features/actions.js';

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

const CLICK_ACTIONS = {
  'select-day': (ds) => actions.selectDay(ds.day),
  'set-mode': (ds) => actions.setMode(ds.mode),
  'exit-edit': () => {
    if(actions.exitEditMode()) showToast('Cambios guardados', { duration: 1600 });
  },
  'toggle-group-optional': (ds) => actions.toggleGroupOptional(ds.group),
  'add-item': (ds) => actions.addItem(ds.group),
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
  'adjust-item-steps': (ds) => actions.adjustItemSteps(ds.group, ds.item, ds.field, Number(ds.delta)),
  'set-step': (ds) => actions.setStep(ds.group, ds.item, Number(ds.step)),
  'bump-step': (ds) => actions.bumpStep(ds.group, ds.item),
  'inc-step': (ds) => actions.adjustStep(ds.group, ds.item, 1),
  'dec-step': (ds) => actions.adjustStep(ds.group, ds.item, -1),
  'hist-point': (ds) => showHistDetail(Number(ds.idx))
};

const CHANGE_ACTIONS = {
  'title': (el) => actions.updateTitle(el.value),
  'notes': (el) => actions.updateNotes(el.value),
  'group-name': (el, ds) => actions.updateGroupName(ds.group, el.value),
  'group-optional': (el, ds) => actions.setGroupOptional(ds.group, el.checked),
  'item-field': (el, ds) => {
    const value = actions.updateItemField(ds.group, ds.item, ds.field, el.value);
    if(ds.field === 'steps' || ds.field === 'minSteps' || ds.field === 'minName') el.value = value;
  },
  'item-min-override': (el, ds) => actions.setMinOverride(ds.group, ds.item, el.checked)
};

function injectIcons(){
  document.getElementById('headerIcon').innerHTML = icon('barbell', 20) + ' Rutina';
  document.getElementById('fabBtn').innerHTML = icon('menu', 22);
  document.getElementById('editMenuBtn').innerHTML = icon('edit', 18) + ' <span id="editLabel">Editar día</span>';
  document.getElementById('histMenuBtn').innerHTML = icon('chart', 18) + ' <span id="histLabel">Ver historial</span>';
  document.getElementById('exportMenuBtn').innerHTML = icon('download', 18) + ' Exportar rutina';
  document.getElementById('importMenuBtn').innerHTML = icon('upload', 18) + ' Importar rutina';
  document.getElementById('resetMenuBtn').innerHTML = icon('refresh', 18) + ' ' + RESET_LABEL;
}

function bindMenuActions(){
  document.getElementById('editMenuBtn').onclick = () => {
    const wasEditing = view.editMode;
    actions.toggleEditMode();
    if(wasEditing) showToast('Cambios guardados', { duration: 1600 });
  };
  document.getElementById('histMenuBtn').onclick = actions.toggleHistView;
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

function boot(){
  onStorageError(() => {
    showToast('No se pudo guardar en el navegador. Los cambios quedan solo en memoria.', {
      error: true,
      duration: 6000
    });
  });
  load();
  onChange(render);
  injectIcons();
  initMenu();
  bindMenuActions();
  bindDelegation();
  initTimer();
  render();
}

boot();
