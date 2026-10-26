import { icon } from '../icons.js';
import { getState } from '../state/store.js';
import { view } from '../state/view.js';
import { esc, escAttr } from '../utils/dom.js';
import { parseLocalISODate } from '../utils/date.js';

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function statusLabel(status){
  return status === 'full' ? 'completo' : status === 'min' ? 'mínimo' : 'parcial';
}

function modeLabel(mode){
  return mode === 'minimo' ? 'mínimo' : 'completo';
}

function monthLabel(key){
  const [year, month] = key.split('-').map(Number);
  if(!year || !month || month < 1 || month > 12) return key;
  const name = MONTH_NAMES[month - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

export function renderHistory(d){
  const s = getState()[d];
  let html = `<div class="group-name history-title">Historial — ${esc(d)}</div>`;
  if(s.log.length === 0){
    return html + `<div class="empty">Todavía no hay registros para este día</div>`;
  }

  html += `<div class="hist-legend" aria-label="Estados del historial">
    <span><i class="hist-dot full"></i>Completo</span>
    <span><i class="hist-dot min"></i>Mínimo</span>
    <span><i class="hist-dot partial"></i>Parcial</span>
  </div>`;

  const entries = s.log
    .map((entry, idx) => ({ entry, idx }))
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date) || a.idx - b.idx);

  const byMonth = new Map();
  entries.forEach(row => {
    const key = row.entry.date.slice(0, 7);
    if(!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(row);
  });

  byMonth.forEach((rows, key) => {
    html += `<div class="hist-month">`;
    html += `<div class="hist-month-label">${esc(monthLabel(key))}</div>`;
    html += `<div class="timeline">`;
    rows.forEach(({ entry, idx }) => {
      const dt = parseLocalISODate(entry.date);
      const dayNumber = dt ? dt.getDate() : '?';
      const label = `${entry.date} · ${statusLabel(entry.status)} · modo ${modeLabel(entry.mode)}`;
      html += `<button type="button" class="hpoint ${esc(entry.status)}" data-action="hist-point" data-idx="${idx}" aria-label="${escAttr(label)}">${dayNumber}</button>`;
    });
    html += `</div></div>`;
  });

  html += `<div id="histDetail"></div>`;
  return html;
}

export function showHistDetail(idx){
  const entry = getState()[view.activeDay].log[idx];
  const box = document.getElementById('histDetail');
  if(!entry || !box) return;

  const items = Array.isArray(entry.items) ? entry.items : [];
  const done = items.filter(it => it.done).length;
  let html = `<div class="hdetail"><div class="hdetail-meta">${esc(entry.date)} · modo ${esc(modeLabel(entry.mode))} · <span class="hstatus ${esc(entry.status)}">${esc(statusLabel(entry.status))}</span> · ${done}/${items.length}</div>`;
  items.forEach(it => {
    html += `<div class="hitem"><span style="color:${it.done ? 'var(--success)' : 'var(--sub)'}">${icon(it.done ? 'check' : 'circle', 15)}</span> ${esc(it.text)} <span style="color:var(--sub); font-size:0.75rem;">(${esc(it.group)})</span></div>`;
  });
  html += `</div>`;
  box.innerHTML = html;
}
