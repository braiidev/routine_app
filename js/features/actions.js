import { getLocalISODate } from '../utils/date.js';
import { uid } from '../utils/dom.js';
import { commit, getState, save } from '../state/store.js';
import { view } from '../state/view.js';
import { consideredGroups, getItemText, getProgress, getSteps, hasMinOverride, isFinished } from '../state/selectors.js';
import { closeMenu } from '../ui/menu.js';
import { DAYS, DEFAULT_STEPS, MAX_STEPS } from '../config.js';

const EDITABLE_FIELDS = ['name', 'steps', 'minName', 'minSteps'];

function currentDay(){
  return getState()[view.activeDay];
}

function ensureProgress(item){
  if(!item.progress || typeof item.progress !== 'object'){
    item.progress = { completo: 0, minimo: 0 };
  }
  return item.progress;
}

function findGroup(gid){
  return currentDay().groups.find(x => x.id === gid);
}

function findItem(gid, iid){
  const g = findGroup(gid);
  return g ? g.items.find(x => x.id === iid) : null;
}

function clampSteps(value){
  return Math.min(MAX_STEPS, Math.max(1, parseInt(value, 10) || 1));
}

function clampProgress(item){
  const progress = ensureProgress(item);
  progress.completo = Math.min(getProgress(item, 'completo'), getSteps(item, 'completo'));
  progress.minimo = Math.min(getProgress(item, 'minimo'), getSteps(item, 'minimo'));
}

function copyName(value, fallback){
  const text = String(value == null ? '' : value).trim();
  return text ? `${text} (copia)` : `${fallback} (copia)`;
}

function cloneItemData(item, suffix){
  const name = suffix ? copyName(item.name, 'Ejercicio') : item.name;
  let minName = item.minName;
  if(minName == null || minName === ''){
    minName = null;
  } else if(suffix){
    minName = minName === item.name ? name : copyName(minName, 'Ejercicio');
  }
  return {
    id: uid(),
    name,
    steps: item.steps,
    minName,
    minSteps: item.minSteps,
    progress: { completo: 0, minimo: 0 }
  };
}

/* Día */

export function selectDay(d){
  if(!DAYS.includes(d)) return;
  view.activeDay = d;
  commit();
}

export function updateTitle(val){
  currentDay().title = val;
  save();
}

export function updateNotes(val){
  currentDay().notes = val;
  save();
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
  return view.editMode;
}

export function exitEditMode(){
  if(!view.editMode) return false;
  view.editMode = false;
  commit();
  return true;
}

export function toggleHistView(){
  view.histView = !view.histView;
  view.editMode = false;
  commit();
  closeMenu();
}

/* Grupos */

export function addGroup(name = 'Nuevo grupo'){
  const clean = String(name == null ? '' : name).trim() || 'Nuevo grupo';
  const group = { id: uid(), name: clean, optional: false, items: [] };
  currentDay().groups.push(group);
  commit();
  return group.id;
}

export function updateGroupName(gid, val){
  const g = findGroup(gid);
  if(g) g.name = val;
  save();
}

export function setGroupOptional(gid, optional){
  const g = findGroup(gid);
  if(g) g.optional = Boolean(optional);
  commit();
}

export function toggleGroupOptional(gid){
  const g = findGroup(gid);
  if(g) g.optional = !g.optional;
  commit();
}

export function moveGroup(gid, delta){
  if(!Number.isFinite(delta) || delta === 0) return false;
  const groups = currentDay().groups;
  const index = groups.findIndex(g => g.id === gid);
  const target = index + delta;
  if(index < 0 || target < 0 || target >= groups.length) return false;
  const [group] = groups.splice(index, 1);
  groups.splice(target, 0, group);
  commit();
  return true;
}

export function duplicateGroup(gid){
  const groups = currentDay().groups;
  const index = groups.findIndex(g => g.id === gid);
  if(index < 0) return null;

  const source = groups[index];
  const group = {
    id: uid(),
    name: copyName(source.name, 'Grupo'),
    optional: source.optional,
    items: source.items.map(it => cloneItemData(it, false))
  };
  groups.splice(index + 1, 0, group);
  commit();
  return group.id;
}

export function deleteGroup(gid){
  const day = currentDay();
  const index = day.groups.findIndex(g => g.id === gid);
  if(index < 0) return null;

  const [group] = day.groups.splice(index, 1);
  commit();
  return { day: view.activeDay, index, group };
}

export function restoreGroup(snapshot){
  if(!snapshot || !snapshot.group) return false;
  const day = getState()[snapshot.day];
  if(!day || day.groups.some(g => g.id === snapshot.group.id)) return false;

  const index = Math.max(0, Math.min(snapshot.index, day.groups.length));
  day.groups.splice(index, 0, snapshot.group);
  commit();
  return true;
}

/* Ítems */

export function addItem(gid, name = 'Nuevo ejercicio'){
  const g = findGroup(gid);
  if(!g) return null;

  const clean = String(name == null ? '' : name).trim() || 'Nuevo ejercicio';
  const item = {
    id: uid(),
    name: clean,
    steps: DEFAULT_STEPS,
    minName: null,
    minSteps: null,
    progress: { completo: 0, minimo: 0 }
  };
  g.items.push(item);
  commit();
  return item.id;
}

export function updateItemField(gid, iid, field, val){
  if(!EDITABLE_FIELDS.includes(field)) return;
  const item = findItem(gid, iid);
  if(!item) return;

  if(field === 'steps' || field === 'minSteps'){
    item[field] = clampSteps(val);
    clampProgress(item);
  } else if(field === 'minName'){
    const text = String(val);
    item.minName = text.trim() ? text : item.name;
  } else {
    item[field] = String(val);
  }
  save();
  return item[field];
}

export function setMinOverride(gid, iid, enabled){
  const item = findItem(gid, iid);
  if(!item) return;

  if(enabled){
    if(!hasMinOverride(item)){
      item.minName = item.name;
      item.minSteps = item.steps;
    }
  } else {
    item.minName = null;
    item.minSteps = null;
    clampProgress(item);
  }
  commit();
}

export function adjustItemSteps(gid, iid, field, delta){
  if(field !== 'steps' && field !== 'minSteps') return;
  if(!Number.isFinite(delta) || delta === 0) return;
  const item = findItem(gid, iid);
  if(!item) return;

  const current = field === 'minSteps' ? getSteps(item, 'minimo') : item.steps;
  const next = Math.min(MAX_STEPS, Math.max(1, current + delta));
  if(next === current) return;

  item[field] = next;
  clampProgress(item);
  commit();
}

export function moveItem(gid, iid, delta){
  if(!Number.isFinite(delta) || delta === 0) return false;
  const g = findGroup(gid);
  if(!g) return false;

  const index = g.items.findIndex(it => it.id === iid);
  const target = index + delta;
  if(index < 0 || target < 0 || target >= g.items.length) return false;

  const [item] = g.items.splice(index, 1);
  g.items.splice(target, 0, item);
  commit();
  return true;
}

export function duplicateItem(gid, iid){
  const g = findGroup(gid);
  if(!g) return null;

  const index = g.items.findIndex(it => it.id === iid);
  if(index < 0) return null;

  const copy = cloneItemData(g.items[index], true);
  g.items.splice(index + 1, 0, copy);
  commit();
  return copy.id;
}

export function deleteItem(gid, iid){
  const day = currentDay();
  const g = findGroup(gid);
  if(!g) return null;

  const index = g.items.findIndex(it => it.id === iid);
  if(index < 0) return null;

  const [item] = g.items.splice(index, 1);
  commit();
  return { day: view.activeDay, groupId: gid, index, item };
}

export function restoreItem(snapshot){
  if(!snapshot || !snapshot.item) return false;
  const day = getState()[snapshot.day];
  const g = day && day.groups.find(x => x.id === snapshot.groupId);
  if(!g || g.items.some(it => it.id === snapshot.item.id)) return false;

  const index = Math.max(0, Math.min(snapshot.index, g.items.length));
  g.items.splice(index, 0, snapshot.item);
  commit();
  return true;
}

/* Progreso */

export function setStep(gid, iid, n){
  if(!Number.isFinite(n)) return;
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

export function adjustStep(gid, iid, delta){
  if(!Number.isFinite(delta) || delta === 0) return;
  const day = currentDay();
  const item = findItem(gid, iid);
  if(!item) return;

  const mode = day.mode;
  const steps = getSteps(item, mode);
  const current = getProgress(item, mode);
  const next = Math.min(steps, Math.max(0, current + delta));
  if(next === current) return;

  ensureProgress(item)[mode] = next;
  if(delta > 0) checkFinished(day, mode);
  commit();
}

export function bumpStep(gid, iid){
  adjustStep(gid, iid, 1);
}

export function decrementStep(gid, iid){
  adjustStep(gid, iid, -1);
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

export function resetProgress(scope = 'current'){
  const day = currentDay();
  const modes = scope === 'both' ? ['completo', 'minimo'] : [day.mode];
  day.groups.forEach(g => g.items.forEach(it => {
    const progress = ensureProgress(it);
    modes.forEach(mode => { progress[mode] = 0; });
  }));
  commit();
  return { scope, mode: day.mode, day: view.activeDay };
}
