import { icon } from '../icons.js';
import { commit, getState } from '../state/store.js';
import { view } from '../state/view.js';
import {
  getBestStreak,
  getCurrentStreak,
  getSession,
  getWeekSummary,
  sessionProgress,
  sessionStatus
} from '../state/selectors.js';
import {
  addDaysISO,
  formatDateLong,
  formatWeekRange,
  getLocalISODate,
  getMonthKey,
  getWeekDates,
  getWeekStartISO,
  isISODate,
  monthLabel,
  parseLocalISODate,
  WEEKDAY_SHORT
} from '../utils/date.js';
import { esc, escAttr } from '../utils/dom.js';
import { renderSessionGroups } from './groups.js';
import { modeForDate, previewSession } from '../features/sessions.js';
import { ensureHistoryWeek } from '../features/actions.js';

export function statusLabel(status){
  if(status === 'full') return 'Completo';
  if(status === 'min') return 'Mínimo';
  if(status === 'partial') return 'Parcial';
  return 'Sin registro';
}

export function modeLabel(mode){
  return mode === 'minimo' ? 'Mínimo' : 'Completo';
}

function dayNumber(date){
  const parsed = parseLocalISODate(date);
  return parsed ? parsed.getDate() : '?';
}

export function renderHistory(){
  const state = getState();
  const sessions = state.sessions;
  const today = view.todayDate || getLocalISODate();
  const currentWeekStart = getWeekStartISO(today);
  const currentStreak = getCurrentStreak(sessions, today);
  const bestStreak = getBestStreak(sessions, today);
  const selected = view.historySelectedDate;

  let html = `<div class="history-head">
    <div>
      <div class="section-label">Historial semanal</div>
      <h2 class="history-title">Tu historial</h2>
    </div>
    <button type="button" class="secondary-btn" data-action="history-date-sheet">Registrar otro día…</button>
  </div>`;

  html += `<div class="streak-grid">
    <div class="streak-card">
      <span class="streak-label">Racha actual</span>
      <strong class="streak-value">${currentStreak}</strong>
      <span class="streak-unit">${currentStreak === 1 ? 'día' : 'días'}</span>
    </div>
    <div class="streak-card">
      <span class="streak-label">Mejor racha</span>
      <strong class="streak-value">${bestStreak}</strong>
      <span class="streak-unit">${bestStreak === 1 ? 'día' : 'días'}</span>
    </div>
  </div>`;

  html += `<div class="hist-legend" aria-label="Estados del historial">
    <span><i class="hist-dot full"></i>Completo</span>
    <span><i class="hist-dot min"></i>Mínimo</span>
    <span><i class="hist-dot partial"></i>Parcial</span>
    <span><i class="hist-dot empty"></i>Sin registro</span>
  </div>`;

  const weeks = [];
  for(let i = 0; i < view.historyVisibleWeeks; i++){
    const start = addDaysISO(currentWeekStart, -7 * i);
    weeks.push({ start, dates: getWeekDates(start) });
  }

  let currentMonth = '';
  weeks.forEach(week => {
    const month = getMonthKey(week.start);
    if(month !== currentMonth){
      currentMonth = month;
      html += `<div class="hist-month-label">${esc(monthLabel(month))}</div>`;
    }

    const summary = getWeekSummary(sessions, week.dates);
    const hasToday = week.dates.includes(today);
    const selectedHere = selected && week.dates.includes(selected);

    html += `<section class="week-card ${hasToday ? 'current' : ''}">
      <div class="week-head">
        <div class="week-title">${esc(formatWeekRange(week.start))}</div>
        <div class="week-summary">${summary.completed}/7 completos</div>
      </div>
      <div class="week-strip" role="group" aria-label="${escAttr(formatWeekRange(week.start))}">
        ${week.dates.map((date, index) => renderDayCell(sessions[date], date, index, today, selected)).join('')}
      </div>
      ${selectedHere ? renderHistoryDetail(selected) : ''}
    </section>`;
  });

  html += `<button type="button" class="show-more-btn" data-action="history-more">Mostrar semanas anteriores</button>`;
  return html;
}

function renderDayCell(session, date, index, today, selected){
  const status = sessionStatus(session);
  const future = date > today;
  const classes = ['day-cell', status, future ? 'future' : '', date === today ? 'today' : '', selected === date ? 'selected' : '']
    .filter(Boolean).join(' ');
  const progress = session ? sessionProgress(session) : null;
  const detail = future
    ? 'Aún no llegó'
    : session
      ? `${statusLabel(status)} · ${modeLabel(session.mode)} · ${progress.itemsDone}/${progress.items} ejercicios`
      : statusLabel('empty');

  return `<button type="button" class="${classes}" data-action="history-select-date" data-date="${escAttr(date)}" ${future ? 'disabled' : ''} aria-label="${escAttr(`${formatDateLong(date)} · ${detail}`)}">
    <span class="day-cell-name">${WEEKDAY_SHORT[index]}</span>
    <span class="day-cell-number">${dayNumber(date)}</span>
    <span class="day-cell-mark" aria-hidden="true">${future ? icon('lock', 11) : ''}</span>
  </button>`;
}

function renderHistoryDetail(date){
  const state = getState();
  const today = view.todayDate || getLocalISODate();
  const session = getSession(state, date);
  const isEditing = view.historyEditDate === date;
  const isToday = date === today;
  const isFuture = date > today;

  if(isEditing){
    return renderEditDetail(date, session);
  }

  let html = `<div class="history-detail">
    <div class="detail-head">
      <div>
        <div class="detail-date">${esc(formatDateLong(date))}</div>
        <div class="detail-meta">${session ? `${esc(statusLabel(sessionStatus(session)))} · modo ${esc(modeLabel(session.mode))}` : 'Sin registro'}</div>
      </div>
      ${session ? `<span class="status-pill ${escAttr(sessionStatus(session))}">${esc(statusLabel(sessionStatus(session)))}</span>` : ''}
    </div>`;

  if(isFuture){
    return html + `<div class="empty">Todavía no llegó este día.</div></div>`;
  }

  if(!session){
    html += `<div class="empty">No hay una sesión registrada para este día.</div>`;
    if(isToday){
      html += `<button type="button" class="primary-btn" data-action="nav-today">Ir a hoy</button>`;
    } else {
      html += `<button type="button" class="primary-btn" data-action="history-register" data-date="${escAttr(date)}">Registrar este día</button>`;
    }
    return html + `</div>`;
  }

  const progress = sessionProgress(session);
  html += `<div class="detail-progress">${progress.itemsDone}/${progress.items} ejercicios · ${progress.done}/${progress.total} series</div>`;
  html += renderSessionGroups(session, { editable: false, date });

  if(isToday){
    html += `<button type="button" class="secondary-btn" data-action="nav-today">Ir a hoy</button>`;
  } else {
    html += `<button type="button" class="primary-btn" data-action="history-edit" data-date="${escAttr(date)}">Editar sesión</button>`;
  }
  return html + `</div>`;
}

function renderEditDetail(date, session){
  const mode = session ? session.mode : modeForDate(date);
  const draft = session || previewSession(date, mode);
  const status = sessionStatus(session);
  const progress = session ? sessionProgress(session) : null;

  let html = `<div class="history-detail editing">
    <div class="detail-head">
      <div>
        <div class="detail-date">${esc(formatDateLong(date))}</div>
        <div class="detail-meta">${session ? `${esc(statusLabel(status))} · ${progress.done}/${progress.total} series` : 'Nuevo registro'}</div>
      </div>
      <button type="button" class="done-btn" data-action="history-edit-done">Listo</button>
    </div>
    <div class="modebar">
      <span class="label">Modo</span>
      <div class="switch">
        <button type="button" class="${mode === 'completo' ? 'active' : ''}" data-action="session-mode" data-date="${escAttr(date)}" data-mode="completo" data-past="1" aria-pressed="${mode === 'completo' ? 'true' : 'false'}">Completo</button>
        <button type="button" class="${mode === 'minimo' ? 'active' : ''}" data-action="session-mode" data-date="${escAttr(date)}" data-mode="minimo" data-past="1" aria-pressed="${mode === 'minimo' ? 'true' : 'false'}">Mínimo</button>
      </div>
    </div>`;

  if(!session){
    html += `<p class="edit-hint">El registro se crea al marcar la primera serie.</p>`;
  }
  html += renderSessionGroups(draft, { editable: true, date, allowPast: true });
  html += `</div>`;
  return html;
}

export function openHistoryDateSheet(){
  if(document.getElementById('historyDateSheet')) return;

  const today = view.todayDate || getLocalISODate();
  const value = view.historySelectedDate && view.historySelectedDate <= today
    ? view.historySelectedDate
    : today;

  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.id = 'historyDateSheet';
  backdrop.innerHTML = `<form class="sheet" role="dialog" aria-modal="true" aria-labelledby="historyDateTitle">
    <div class="sheet-head">
      <div>
        <h2 class="sheet-title" id="historyDateTitle">Registrar otro día</h2>
        <p class="sheet-help">Elegí una fecha pasada para consultar, registrar o corregir. Si elegís hoy, se abre su detalle en Historial.</p>
      </div>
      <button type="button" class="sheet-close" data-history-date-close aria-label="Cerrar">×</button>
    </div>
    <label class="field field-name">
      <span>Fecha</span>
      <input type="date" name="date" max="${escAttr(today)}" value="${escAttr(value)}" required>
    </label>
    <button type="submit" class="primary-btn">Abrir fecha</button>
    <button type="button" class="sheet-cancel" data-history-date-close>Cancelar</button>
  </form>`;

  let closed = false;
  function close(){
    if(closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
  }

  function onKey(e){
    if(e.key === 'Escape'){
      e.preventDefault();
      close();
    }
  }

  backdrop.addEventListener('click', (e) => {
    if(e.target === backdrop || e.target.closest('[data-history-date-close]')){
      close();
    }
  });

  backdrop.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = backdrop.querySelector('input[name="date"]');
    const date = input ? input.value : '';
    if(!isISODate(date) || date > today){
      if(input) input.focus();
      return;
    }
    view.screen = 'history';
    view.historySelectedDate = date;
    view.historyEditDate = date < today ? date : '';
    ensureHistoryWeek(date);
    close();
    commit();
  });

  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  const input = backdrop.querySelector('input[name="date"]');
  if(input) input.focus();
}
