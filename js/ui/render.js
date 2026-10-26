import { DAYS } from '../config.js';
import { icon } from '../icons.js';
import { getState } from '../state/store.js';
import { view } from '../state/view.js';
import { isFinished } from '../state/selectors.js';
import { esc, escAttr } from '../utils/dom.js';
import { renderGroups, renderNotes } from './groups.js';
import { renderHistory } from './history.js';

export function render(){
  renderTabs();
  renderDay();

  document.getElementById('editLabel').textContent = view.editMode ? 'Terminar edición' : 'Editar día';
  document.getElementById('histLabel').textContent = view.histView ? 'Volver a rutina' : 'Ver historial';
}

function renderTabs(){
  const tabsEl = document.getElementById('tabs');
  if(tabsEl.children.length !== DAYS.length){
    tabsEl.innerHTML = '';
    DAYS.forEach(d => {
      const tab = document.createElement('button');
      tab.className = 'tab';
      tab.textContent = d;
      tab.dataset.action = 'select-day';
      tab.dataset.day = d;
      tabsEl.appendChild(tab);
    });
  }
  Array.from(tabsEl.children).forEach((tab, i) => {
    tab.classList.toggle('active', DAYS[i] === view.activeDay);
  });
}

function renderDay(){
  const daysEl = document.getElementById('days');
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
  daysEl.replaceChildren(pane);
}
