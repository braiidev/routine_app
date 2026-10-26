import { getLocalISODate } from '../utils/date.js';
import { uid } from '../utils/dom.js';
import { commit, getState } from '../state/store.js';
import { view } from '../state/view.js';
import { consideredGroups, getItemText, getProgress, getSteps, isFinished } from '../state/selectors.js';
import { closeMenu } from '../ui/menu.js';
import { DAYS } from '../config.js';

const EDITABLE_FIELDS = ['textCompleto', 'textMinimo', 'stepsCompleto', 'stepsMinimo'];

function currentDay(){
  return getState()[view.activeDay];
}

function ensureProgress(item){
  if(!item.progress || typeof item.progress !== 'object'){
    item.progress = { completo: 0, minimo: 0 };
  }
  return item.progress;
}

/* Día */

export function selectDay(d){
  if(!DAYS.includes(d)) return;
  view.activeDay = d;
  view.pendingDeleteGroup = null;
  view.pendingDeleteItem = null;
  commit();
}

export function updateTitle(val){
  currentDay().title = val;
  commit();
}

export function updateNotes(val){
  currentDay().notes = val;
  commit();
}

export function setMode(mode){
  if(mode !== 'completo' && mode !== 'minimo') return;
  currentDay().mode = mode;
  commit();
}

export function toggleEditMode(){
  view.editMode = !view.editMode;
  view.histView = false;
  commit();
  closeMenu();
}

export function toggleHistView(){
  view.histView = !view.histView;
  view.editMode = false;
  commit();
  closeMenu();
}

/* Grupos */

export function addGroup(){
  currentDay().groups.push({ id: uid(), name: 'Nuevo grupo', optional: false, items: [] });
  commit();
}

export function updateGroupName(gid, val){
  const g = currentDay().groups.find(x => x.id === gid);
  if(g) g.name = val;
  commit();
}

export function toggleGroupOptional(gid){
  const g = currentDay().groups.find(x => x.id === gid);
  if(g) g.optional = !g.optional;
  commit();
}

export function deleteGroup(gid){
  if(view.pendingDeleteGroup !== gid){
    view.pendingDeleteGroup = gid;
    commit();
    return;
  }
  view.pendingDeleteGroup = null;
  const day = currentDay();
  day.groups = day.groups.filter(x => x.id !== gid);
  commit();
}

/* Ítems */

export function addItem(gid){
  const g = currentDay().groups.find(x => x.id === gid);
  if(!g) return;
  g.items.push({
    id: uid(),
    textCompleto: 'Nuevo ítem',
    textMinimo: 'Nuevo ítem',
    stepsCompleto: 1,
    stepsMinimo: 1,
    progress: { completo: 0, minimo: 0 }
  });
  commit();
}

export function updateItemField(gid, iid, field, val){
  if(!EDITABLE_FIELDS.includes(field)) return;
  const g = currentDay().groups.find(x => x.id === gid);
  const item = g && g.items.find(x => x.id === iid);
  if(!item) return;

  const progress = ensureProgress(item);
  if(field === 'stepsCompleto' || field === 'stepsMinimo'){
    item[field] = Math.max(1, parseInt(val, 10) || 1);
    const modeKey = field === 'stepsCompleto' ? 'completo' : 'minimo';
    if(getProgress(item, modeKey) > item[field]) progress[modeKey] = item[field];
  } else {
    item[field] = String(val);
  }
  commit();
}

export function deleteItem(gid, iid){
  if(view.pendingDeleteItem !== iid){
    view.pendingDeleteItem = iid;
    commit();
    return;
  }
  view.pendingDeleteItem = null;
  const g = currentDay().groups.find(x => x.id === gid);
  if(!g) return;
  g.items = g.items.filter(x => x.id !== iid);
  commit();
}

/* Progreso */

function findItem(gid, iid){
  const g = currentDay().groups.find(x => x.id === gid);
  return g ? g.items.find(x => x.id === iid) : null;
}

export function setStep(gid, iid, n){
  const day = currentDay();
  const item = findItem(gid, iid);
  if(!item) return;

  const mode = day.mode;
  const steps = getSteps(item, mode);
  const current = getProgress(item, mode);
  let next = current === n ? n - 1 : n;
  if(next > steps) next = steps;
  if(next < 0) next = 0;
  ensureProgress(item)[mode] = next;

  checkFinished(day, mode);
  commit();
}

export function bumpStep(gid, iid){
  const day = currentDay();
  const item = findItem(gid, iid);
  if(!item) return;

  const mode = day.mode;
  const steps = getSteps(item, mode);
  const current = getProgress(item, mode);
  ensureProgress(item)[mode] = current >= steps ? 0 : current + 1;

  checkFinished(day, mode);
  commit();
}

function checkFinished(day, mode){
  if(isFinished(getState(), view.activeDay, mode)) logCompletion(mode);
}

function logCompletion(mode){
  const day = currentDay();
  const today = getLocalISODate();
  if(day.log.find(l => l.date === today && l.mode === mode)) return;

  const items = [];
  consideredGroups(getState(), view.activeDay, mode).forEach(g => {
    g.items.forEach(it => {
      items.push({
        text: getItemText(it, mode),
        done: getProgress(it, mode) >= getSteps(it, mode),
        group: g.name
      });
    });
  });

  const allDone = items.every(i => i.done);
  day.log.push({
    date: today,
    mode,
    items,
    status: allDone ? (mode === 'completo' ? 'full' : 'min') : 'partial'
  });
}

/* Reinicio del día */

export function resetDay(){
  if(!view.pendingResetDay){
    view.pendingResetDay = true;
    const btn = document.getElementById('resetMenuBtn');
    if(btn) btn.textContent = '¿Confirmar reinicio?';
    return;
  }
  view.pendingResetDay = false;
  const day = currentDay();
  const mode = day.mode;
  day.groups.forEach(g => g.items.forEach(it => {
    if(it.progress) it.progress[mode] = 0;
  }));
  commit();
  closeMenu();
}
