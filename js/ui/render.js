import { DAYS } from '../config.js';
import { icon } from '../icons.js';
import { getState } from '../state/store.js';
import { view } from '../state/view.js';
import { isFinished } from '../state/selectors.js';
import { esc, escAttr } from '../utils/dom.js';
import { renderGroups, renderNotes } from './groups.js';
import { renderHistory } from './history.js';

export function render(){
  const tabsEl = document.getElementById('tabs');
  const daysEl = document.getElementById('days');
  tabsEl.innerHTML = '';
  daysEl.innerHTML = '';

  DAYS.forEach(d => {
    const tab = document.createElement('button');
    tab.className = 'tab' + (d === view.activeDay ? ' active' : '');
    tab.textContent = d;
    tab.dataset.action = 'select-day';
    tab.dataset.day = d;
    tabsEl.appendChild(tab);
  });

  const d = view.activeDay;
  const s = getState()[d];
  const pane = document.createElement('div');
  pane.className = 'day-pane active';

  let html = '';
  if(isFinished(getState(), d, s.mode)){
    html += `<div class="finished-banner">${icon('check', 16)} Día completado (${esc(s.mode)})</div>`;
  }

  html += `<div class="day-title">`;
  html += view.editMode
    ? `<input type="text" value="${escAttr(s.title)}" data-edit="title">`
    : `${esc(s.title)}`;
  html += `</div>`;

  html += `<div class="modebar">
    <span class="label">Modo</span>
    <div class="switch">
      <button class="${s.mode === 'completo' ? 'active' : ''}" data-action="set-mode" data-mode="completo">Completo</button>
      <button class="${s.mode === 'minimo' ? 'active' : ''}" data-action="set-mode" data-mode="minimo">Mínimo</button>
    </div>
  </div>`;

  if(view.histView){
    html += renderHistory(d);
  } else {
    html += renderNotes(d);
    html += renderGroups(d);
    if(view.editMode){
      html += `<div class="add-group-row"><button class="add-group-btn" data-action="add-group">${icon('plus', 15)} Nuevo grupo</button></div>`;
    }
  }

  pane.innerHTML = html;
  daysEl.appendChild(pane);

  document.getElementById('editLabel').textContent = view.editMode ? 'Guardar día' : 'Editar día';
  document.getElementById('histLabel').textContent = view.histView ? 'Volver a rutina' : 'Ver historial';
}
