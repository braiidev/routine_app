import { MAX_STEPS } from '../config.js';
import { icon } from '../icons.js';
import { getState } from '../state/store.js';
import { view } from '../state/view.js';
import { getItemText, getProgress, getSteps } from '../state/selectors.js';
import { esc, escAttr } from '../utils/dom.js';

export function renderNotes(d){
  const s = getState()[d];
  if(view.editMode){
    return `<div class="group-name" style="margin:14px 0 6px;">Instrucciones</div>
      <div class="notes"><textarea data-edit="notes">${esc(s.notes)}</textarea></div>`;
  }
  if(s.notes && s.notes.trim()){
    return `<div class="group-name" style="margin:14px 0 6px;">Instrucciones</div><div style="color:var(--sub); font-size:0.85rem; margin-bottom:10px;">${esc(s.notes)}</div>`;
  }
  return '';
}

export function renderGroups(d){
  const s = getState()[d];
  if(s.groups.length === 0){
    return `<div class="empty">${view.editMode ? 'Sin grupos. Tocá "Nuevo grupo" para empezar.' : 'Este día todavía no tiene grupos cargados.'}</div>`;
  }

  let html = '';
  s.groups.forEach(g => {
    if(!view.editMode && s.mode === 'minimo' && g.optional) return;

    html += `<div class="group">`;
    html += `<div class="group-head">`;
    html += `<div class="group-name">`;
    if(view.editMode){
      html += `<input type="text" value="${escAttr(g.name)}" data-edit="group-name" data-group="${escAttr(g.id)}" style="font-size:0.8rem; font-weight:600; border:1px solid var(--border); border-radius:6px; padding:3px 6px; background:var(--card); color:var(--text); text-transform:none; letter-spacing:0;">`;
    } else {
      html += esc(g.name);
      if(g.optional) html += `<span class="opt-pill">opcional</span>`;
    }
    html += `</div>`;

    if(view.editMode){
      const gPending = view.pendingDeleteGroup === g.id;
      html += `<div class="group-actions">
        <button class="icon-btn sub" title="Opcional" data-action="toggle-group-optional" data-group="${escAttr(g.id)}">${icon('star', 15, g.optional)}</button>
        <button class="icon-btn" data-action="add-item" data-group="${escAttr(g.id)}">${icon('plus', 15)}</button>
        <button class="icon-btn danger" data-action="delete-group" data-group="${escAttr(g.id)}" style="${gPending ? 'background:var(--danger); color:#fff; width:auto; padding:0 8px; font-size:0.72rem;' : ''}">${gPending ? 'confirmar' : icon('trash', 15)}</button>
      </div>`;
    }
    html += `</div>`;

    if(g.items.length === 0){
      html += `<div class="empty">${view.editMode ? 'Agregá un ítem con +' : 'Sin ítems'}</div>`;
    }
    g.items.forEach(item => {
      html += renderItem(s, g, item);
    });
    html += `</div>`;
  });
  return html;
}

function renderItem(s, g, item){
  const mode = s.mode;
  const text = getItemText(item, mode);
  const steps = getSteps(item, mode);
  const progress = getProgress(item, mode);
  const isDone = steps > 0 && progress >= steps;

  if(view.editMode){
    return `<div class="item">
      <div class="edit-fields">
        <div class="edit-row"><label>Completo</label><input type="text" value="${escAttr(item.textCompleto)}" data-edit="item-field" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="textCompleto"></div>
        <div class="edit-row"><label>Series C</label><input type="number" min="1" max="${MAX_STEPS}" value="${escAttr(item.stepsCompleto)}" data-edit="item-field" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="stepsCompleto"></div>
        <div class="edit-row"><label>Mínimo</label><input type="text" value="${escAttr(item.textMinimo)}" data-edit="item-field" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="textMinimo"></div>
        <div class="edit-row"><label>Series M</label><input type="number" min="1" max="${MAX_STEPS}" value="${escAttr(item.stepsMinimo)}" data-edit="item-field" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="stepsMinimo"></div>
      </div>
      <div class="item-del-row"><button class="icon-btn danger" data-action="delete-item" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" style="${view.pendingDeleteItem === item.id ? 'background:var(--danger); color:#fff; width:auto; padding:0 8px; font-size:0.72rem;' : ''}">${view.pendingDeleteItem === item.id ? 'confirmar' : icon('trash', 15)}</button></div>
    </div>`;
  }

  let dots = '';
  for(let i = 0; i < steps; i++){
    dots += `<div class="step-dot ${i < progress ? 'on' : ''}" data-action="set-step" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-step="${i + 1}"></div>`;
  }

  return `<div class="item ${isDone ? 'done' : ''}">
    <div class="item-row">
      <div class="item-txt" data-action="bump-step" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}">${esc(text)}</div>
      <div class="steps">${dots}<span class="step-count">${progress}/${steps}</span></div>
    </div>
  </div>`;
}
