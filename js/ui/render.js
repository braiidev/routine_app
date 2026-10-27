import { DAYS } from '../config.js';
import { icon } from '../icons.js';
import { getState } from '../state/store.js';
import { view } from '../state/view.js';
import {
  getSession,
  isSessionComplete,
  sessionProgress,
  sessionStatus
} from '../state/selectors.js';
import {
  formatDateLong,
  getDayNameFromISODate,
  getLocalISODate,
  getWeekDates,
  parseLocalISODate,
  WEEKDAY_SHORT
} from '../utils/date.js';
import { esc, escAttr } from '../utils/dom.js';
import { renderEditorGroups, renderNotes, renderSessionGroups, renderTemplatePreview } from './groups.js';
import { renderHistory, statusLabel } from './history.js';
import { modeForDate, previewSession } from '../features/sessions.js';

export function render(){
  renderPrimaryNav();
  renderTabs();
  renderContent();

  const editLabel = document.getElementById('editLabel');
  if(editLabel) editLabel.textContent = view.screen === 'editor' ? 'Terminar edición' : 'Editar rutina';

  const timerBox = document.getElementById('timerBox');
  if(timerBox){
    timerBox.hidden = !(view.screen === 'today' && view.selectedDate === view.todayDate);
  }
}

function renderPrimaryNav(){
  const nav = document.getElementById('primaryNav');
  if(!nav) return;
  const todayActive = view.screen === 'today';
  const historyActive = view.screen === 'history';
  nav.innerHTML = `<button type="button" class="primary-nav-btn ${todayActive ? 'active' : ''}" data-action="nav-today" ${todayActive ? 'aria-current="page"' : ''}>${icon('barbell', 16)} Hoy</button>
    <button type="button" class="primary-nav-btn ${historyActive ? 'active' : ''}" data-action="nav-history" ${historyActive ? 'aria-current="page"' : ''}>${icon('chart', 16)} Historial</button>`;
}

function renderTabs(){
  const tabsEl = document.getElementById('tabs');
  if(!tabsEl) return;

  if(view.screen === 'history'){
    tabsEl.hidden = true;
    tabsEl.innerHTML = '';
    return;
  }

  tabsEl.hidden = false;
  tabsEl.innerHTML = '';

  if(view.screen === 'editor'){
    DAYS.forEach(day => {
      const tab = document.createElement('button');
      tab.className = `tab ${day === view.editorDay ? 'active' : ''}`;
      tab.textContent = day;
      tab.dataset.action = 'select-editor-day';
      tab.dataset.day = day;
      tabsEl.appendChild(tab);
    });
    return;
  }

  const today = view.todayDate || getLocalISODate();
  const state = getState();
  getWeekDates(today).forEach((date, index) => {
    const parsed = parseLocalISODate(date);
    const session = getSession(state, date);
    const status = sessionStatus(session);
    const tab = document.createElement('button');
    tab.className = [
      'day-tab',
      date === view.selectedDate ? 'active' : '',
      date === today ? 'today' : '',
      date > today ? 'future' : '',
      status !== 'empty' ? `has-${status}` : ''
    ].filter(Boolean).join(' ');
    tab.dataset.action = 'select-date';
    tab.dataset.date = date;
    tab.setAttribute('aria-label', `${formatDateLong(date)}${session ? ` · ${statusLabel(status)}` : ''}`);
    tab.innerHTML = `<span class="day-tab-name">${WEEKDAY_SHORT[index]}</span><span class="day-tab-number">${parsed ? parsed.getDate() : '?'}</span><span class="day-tab-dot" aria-hidden="true"></span>`;
    tabsEl.appendChild(tab);
  });
}

function renderContent(){
  const daysEl = document.getElementById('days');
  if(!daysEl) return;

  const pane = document.createElement('div');
  pane.className = 'day-pane active';

  if(view.screen === 'history'){
    pane.innerHTML = renderHistory();
  } else if(view.screen === 'editor'){
    pane.innerHTML = renderEditor();
  } else {
    pane.innerHTML = renderToday();
  }

  daysEl.replaceChildren(pane);
}

function renderToday(){
  const state = getState();
  const today = view.todayDate || getLocalISODate();
  const date = view.selectedDate || today;

  if(date < today){
    return `<div class="date-head">
      <div class="section-label">Fecha pasada</div>
      <div class="day-title">${esc(formatDateLong(date))}</div>
    </div>
    <div class="empty">Las fechas pasadas se consultan y editan desde Historial.</div>
    <button type="button" class="primary-btn" data-action="nav-history">Abrir historial</button>`;
  }

  const dayName = getDayNameFromISODate(date);
  const templateDay = state.template[dayName];
  const session = getSession(state, date);
  const mode = session ? session.mode : modeForDate(date);
  const display = session || previewSession(date, mode);
  const progress = sessionProgress(display);
  const isToday = date === today;
  const isFuture = date > today;

  let html = `<div class="date-head">
    <div class="section-label">${isToday ? 'Hoy' : 'Vista previa'}</div>
    <div class="day-title">${esc(formatDateLong(date))}</div>
    ${templateDay.title && templateDay.title !== dayName ? `<div class="day-subtitle">${esc(templateDay.title)}</div>` : ''}
  </div>`;

  if(isFuture){
    html += `<div class="preview-banner">
      ${icon('lock', 16)}
      <div><strong>Solo podés marcar hoy</strong><span>Este día se muestra como plantilla. Los checks se habilitan cuando llegue la fecha.</span></div>
    </div>`;
  }

  if(isToday && isSessionComplete(session)){
    html += `<div class="finished-banner">${icon('check', 16)} Sesión completada (${esc(session.mode === 'minimo' ? 'mínimo' : 'completo')})</div>`;
  }

  html += `<div class="today-summary">
    <span>${session ? `${progress.itemsDone}/${progress.items} ejercicios` : 'Sin registro todavía'}</span>
    ${session ? `<span>${progress.done}/${progress.total} series</span>` : ''}
  </div>`;

  html += `<div class="modebar">
    <span class="label">${isToday ? 'Modo de hoy' : 'Modo de la plantilla'}</span>
    <div class="switch">
      <button type="button" class="${mode === 'completo' ? 'active' : ''}" data-action="session-mode" data-date="${escAttr(date)}" data-mode="completo" aria-pressed="${mode === 'completo' ? 'true' : 'false'}" ${isFuture ? 'disabled' : ''}>Completo</button>
      <button type="button" class="${mode === 'minimo' ? 'active' : ''}" data-action="session-mode" data-date="${escAttr(date)}" data-mode="minimo" aria-pressed="${mode === 'minimo' ? 'true' : 'false'}" ${isFuture ? 'disabled' : ''}>Mínimo</button>
    </div>
  </div>`;

  html += renderNotes(templateDay, false);

  if(isFuture){
    html += renderTemplatePreview(templateDay, mode);
    html += `<div class="preview-actions">
      <button type="button" class="primary-btn" data-action="start-editor" data-day="${escAttr(dayName)}" data-date="${escAttr(date)}">${icon('edit', 16)} Editar rutina</button>
      <button type="button" class="secondary-btn" data-action="nav-today">Volver a hoy</button>
    </div>`;
    return html;
  }

  if(!session){
    html += `<p class="edit-hint">La sesión de hoy se crea al marcar la primera serie.</p>`;
  }
  html += renderSessionGroups(display, { editable: true, date, allowPast: false });
  return html;
}

function renderEditor(){
  const day = getState().template[view.editorDay];
  if(!day) return '';

  let html = `<div class="edit-banner">
    <div class="edit-banner-text">${icon('edit', 16)}<div><strong>Editando plantilla</strong><span>Los cambios no alteran sesiones pasadas</span></div></div>
    <button type="button" class="done-btn" data-action="stop-editor">Listo</button>
  </div>`;

  html += `<div class="day-title">
    <input type="text" value="${escAttr(day.title)}" data-edit="title" aria-label="Nombre del día" placeholder="Nombre del día">
  </div>`;

  html += `<div class="modebar">
    <span class="label">Modo por defecto</span>
    <div class="switch">
      <button type="button" class="${day.defaultMode === 'completo' ? 'active' : ''}" data-action="set-default-mode" data-mode="completo" aria-pressed="${day.defaultMode === 'completo' ? 'true' : 'false'}">Completo</button>
      <button type="button" class="${day.defaultMode === 'minimo' ? 'active' : ''}" data-action="set-default-mode" data-mode="minimo" aria-pressed="${day.defaultMode === 'minimo' ? 'true' : 'false'}">Mínimo</button>
    </div>
  </div>`;

  html += `<p class="editor-note">La plantilla define los ejercicios de los próximos registros. Las sesiones ya guardadas conservan su propio detalle.</p>`;
  html += renderNotes(day, true);
  html += renderEditorGroups(day);
  return html;
}
