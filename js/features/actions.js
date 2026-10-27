import { uid } from '../utils/dom.js';
import { commit, getState, save } from '../state/store.js';
import { view } from '../state/view.js';
import { hasMinOverride } from '../state/selectors.js';
import { closeMenu } from '../ui/menu.js';
import { DAYS, DEFAULT_STEPS, MAX_STEPS } from '../config.js';
import {
  adjustSessionStep,
  isDateEditable,
  resetSession,
  setSessionStep,
  switchSessionMode
} from './sessions.js';
import {
  getDayNameFromISODate,
  getLocalISODate,
  getWeekStartISO,
  isISODate,
  weeksBetween
} from '../utils/date.js';

const EDITABLE_FIELDS = ['name', 'steps', 'minName', 'minSteps'];

function currentDay(){
  return getState().template[view.editorDay];
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
    minSteps: item.minSteps
  };
}

function ensureHistoryWeek(date){
  const currentWeek = getWeekStartISO(view.todayDate);
  const targetWeek = getWeekStartISO(date);
  if(targetWeek > currentWeek) return;
  const distance = weeksBetween(targetWeek, currentWeek);
  view.historyVisibleWeeks = Math.max(view.historyVisibleWeeks, distance + 1);
}

/* Navegación */

export function goToday(){
  view.screen = 'today';
  view.selectedDate = view.todayDate;
  view.historyEditDate = '';
  commit();
  closeMenu();
}

export function goHistory(){
  view.screen = 'history';
  view.historyEditDate = '';
  if(!view.historySelectedDate) view.historySelectedDate = view.todayDate;
  ensureHistoryWeek(view.historySelectedDate);
  commit();
  closeMenu();
}

export function selectDate(date){
  if(!isISODate(date)) return;
  const today = getLocalISODate();
  if(date < today){
    view.screen = 'history';
    view.historySelectedDate = date;
    view.historyEditDate = '';
    ensureHistoryWeek(date);
  } else {
    view.screen = 'today';
    view.selectedDate = date;
    view.historyEditDate = '';
  }
  commit();
}

export function selectHistoryDate(date){
  if(!isISODate(date)) return;
  view.screen = 'history';
  view.historySelectedDate = date;
  view.historyEditDate = '';
  ensureHistoryWeek(date);
  commit();
}

export function beginHistoryEdit(date){
  if(!isISODate(date) || date >= getLocalISODate()) return false;
  view.screen = 'history';
  view.historySelectedDate = date;
  view.historyEditDate = date;
  ensureHistoryWeek(date);
  commit();
  return true;
}

export function endHistoryEdit(){
  view.historyEditDate = '';
  commit();
}

export function showMoreWeeks(){
  view.historyVisibleWeeks += 8;
  commit();
}

/* Editor de plantilla */

export function startEditing(day = '', date = ''){
  const contextDate = view.screen === 'history'
    ? (view.historySelectedDate || view.todayDate)
    : (view.selectedDate || view.todayDate);
  const selected = isISODate(date) ? date : contextDate;
  const dayName = DAYS.includes(day) ? day : getDayNameFromISODate(selected);
  view.screen = 'editor';
  view.editorDay = DAYS.includes(dayName) ? dayName : view.editorDay;
  commit();
  closeMenu();
}

export function stopEditing(){
  if(view.screen !== 'editor') return false;
  view.screen = 'today';
  view.selectedDate = view.todayDate;
  commit();
  return true;
}

export function selectEditorDay(d){
  if(!DAYS.includes(d)) return;
  view.editorDay = d;
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

export function setDefaultMode(mode){
  if(mode !== 'completo' && mode !== 'minimo') return;
  currentDay().defaultMode = mode;
  commit();
}

/* Grupos de la plantilla */

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
  return { day: view.editorDay, index, group };
}

export function restoreGroup(snapshot){
  if(!snapshot || !snapshot.group) return false;
  const day = getState().template[snapshot.day];
  if(!day || day.groups.some(g => g.id === snapshot.group.id)) return false;

  const index = Math.max(0, Math.min(snapshot.index, day.groups.length));
  day.groups.splice(index, 0, snapshot.group);
  commit();
  return true;
}

/* Ejercicios de la plantilla */

export function addItem(gid, name = 'Nuevo ejercicio'){
  const g = findGroup(gid);
  if(!g) return null;

  const clean = String(name == null ? '' : name).trim() || 'Nuevo ejercicio';
  const item = {
    id: uid(),
    name: clean,
    steps: DEFAULT_STEPS,
    minName: null,
    minSteps: null
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
  }
  commit();
}

export function adjustItemSteps(gid, iid, field, delta){
  if(field !== 'steps' && field !== 'minSteps') return;
  if(!Number.isFinite(delta) || delta === 0) return;
  const item = findItem(gid, iid);
  if(!item) return;

  const current = field === 'minSteps' && item.minSteps != null ? item.minSteps : item.steps;
  const next = Math.min(MAX_STEPS, Math.max(1, current + delta));
  if(next === current) return;

  item[field] = next;
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
  const g = findGroup(gid);
  if(!g) return null;

  const index = g.items.findIndex(it => it.id === iid);
  if(index < 0) return null;

  const [item] = g.items.splice(index, 1);
  commit();
  return { day: view.editorDay, groupId: gid, index, item };
}

export function restoreItem(snapshot){
  if(!snapshot || !snapshot.item) return false;
  const day = getState().template[snapshot.day];
  const g = day && day.groups.find(x => x.id === snapshot.groupId);
  if(!g || g.items.some(it => it.id === snapshot.item.id)) return false;

  const index = Math.max(0, Math.min(snapshot.index, g.items.length));
  g.items.splice(index, 0, snapshot.item);
  commit();
  return true;
}

/* Sesiones por fecha */

export function setSessionMode(date, mode, force = false, allowPast = false){
  if(!isISODate(date)) return { ok: false, reason: 'invalid' };
  return switchSessionMode(date, mode, { force, allowPast });
}

export function setStep(date, gid, iid, n, allowPast = false){
  return setSessionStep(date, gid, iid, n, allowPast);
}

export function adjustStep(date, gid, iid, delta, allowPast = false){
  return adjustSessionStep(date, gid, iid, delta, allowPast);
}

export function bumpStep(date, gid, iid, allowPast = false){
  return adjustSessionStep(date, gid, iid, 1, allowPast);
}

export function decrementStep(date, gid, iid, allowPast = false){
  return adjustSessionStep(date, gid, iid, -1, allowPast);
}

export function resetDateSession(date, allowPast = false){
  return resetSession(date, allowPast);
}

export function resetToday(){
  const today = getLocalISODate();
  return resetSession(today, false);
}

export function canEditDate(date, allowPast = false){
  return isDateEditable(date, allowPast);
}
