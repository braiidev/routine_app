import { load, onChange } from './state/store.js';
import { icon } from './icons.js';
import { render } from './ui/render.js';
import { initMenu, closeMenu } from './ui/menu.js';
import { showHistDetail } from './ui/history.js';
import { exportRoutine, importRoutineFile } from './ui/backup.js';
import { initTimer } from './features/timer.js';
import * as actions from './features/actions.js';

const CLICK_ACTIONS = {
  'select-day': (ds) => actions.selectDay(ds.day),
  'set-mode': (ds) => actions.setMode(ds.mode),
  'add-group': () => actions.addGroup(),
  'toggle-group-optional': (ds) => actions.toggleGroupOptional(ds.group),
  'add-item': (ds) => actions.addItem(ds.group),
  'delete-group': (ds) => actions.deleteGroup(ds.group),
  'delete-item': (ds) => actions.deleteItem(ds.group, ds.item),
  'set-step': (ds) => actions.setStep(ds.group, ds.item, Number(ds.step)),
  'bump-step': (ds) => actions.bumpStep(ds.group, ds.item),
  'hist-point': (ds) => showHistDetail(Number(ds.idx))
};

const CHANGE_ACTIONS = {
  'title': (el) => actions.updateTitle(el.value),
  'notes': (el) => actions.updateNotes(el.value),
  'group-name': (el, ds) => actions.updateGroupName(ds.group, el.value),
  'item-field': (el, ds) => actions.updateItemField(ds.group, ds.item, ds.field, el.value)
};

function injectIcons(){
  document.getElementById('headerIcon').innerHTML = icon('barbell', 20) + ' Rutina';
  document.getElementById('fabBtn').innerHTML = icon('menu', 22);
  document.getElementById('editMenuBtn').innerHTML = icon('edit', 18) + ' <span id="editLabel">Editar día</span>';
  document.getElementById('histMenuBtn').innerHTML = icon('chart', 18) + ' <span id="histLabel">Ver historial</span>';
  document.getElementById('exportMenuBtn').innerHTML = icon('download', 18) + ' Exportar rutina';
  document.getElementById('importMenuBtn').innerHTML = icon('upload', 18) + ' Importar rutina';
  document.getElementById('resetMenuBtn').innerHTML = icon('refresh', 18) + ' Reiniciar checks del día';
}

function bindMenuActions(){
  document.getElementById('editMenuBtn').onclick = actions.toggleEditMode;
  document.getElementById('histMenuBtn').onclick = actions.toggleHistView;
  document.getElementById('resetMenuBtn').onclick = actions.resetDay;

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
}

function boot(){
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
