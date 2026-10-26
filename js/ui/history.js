import { icon } from '../icons.js';
import { getState } from '../state/store.js';
import { view } from '../state/view.js';
import { esc, escAttr } from '../utils/dom.js';
import { parseLocalISODate } from '../utils/date.js';

export function renderHistory(d){
  const s = getState()[d];
  let html = `<div class="group-name" style="margin:14px 0 8px;">Historial — ${esc(d)}</div>`;
  if(s.log.length === 0){
    return html + `<div class="empty">Todavía no completaste este día</div>`;
  }
  html += `<div class="timeline">`;
  s.log.forEach((entry, idx) => {
    const dt = parseLocalISODate(entry.date);
    const dayNumber = dt ? dt.getDate() : '?';
    const statusLabel = entry.status === 'full' ? 'completo' : entry.status === 'min' ? 'mínimo' : 'parcial';
    html += `<button type="button" class="hpoint ${esc(entry.status)}" data-action="hist-point" data-idx="${idx}" aria-label="${escAttr(`${entry.date} · ${statusLabel}`)}">${dayNumber}</button>`;
  });
  html += `</div><div id="histDetail"></div>`;
  return html;
}

export function showHistDetail(idx){
  const entry = getState()[view.activeDay].log[idx];
  const box = document.getElementById('histDetail');
  if(!entry || !box) return;

  let html = `<div class="hdetail"><div style="margin-bottom:6px; color:var(--sub); font-size:0.78rem;">${esc(entry.date)} · modo ${esc(entry.mode)}</div>`;
  entry.items.forEach(it => {
    html += `<div class="hitem"><span style="color:${it.done ? 'var(--success)' : 'var(--sub)'}">${icon(it.done ? 'check' : 'circle', 15)}</span> ${esc(it.text)} <span style="color:var(--sub); font-size:0.75rem;">(${esc(it.group)})</span></div>`;
  });
  html += `</div>`;
  box.innerHTML = html;
}
