import { MAX_STEPS } from '../config.js';
import { icon } from '../icons.js';
import { getState } from '../state/store.js';
import { view } from '../state/view.js';
import { getItemText, getProgress, getSteps, hasMinOverride } from '../state/selectors.js';
import { esc, escAttr } from '../utils/dom.js';

export function renderNotes(d){
  const s = getState()[d];
  if(view.editMode){
    return `<div class="section-label">Instrucciones del día</div>
      <div class="notes"><textarea data-edit="notes" placeholder="Ej.: calentar 10 minutos, descansar 90 segundos entre series.">${esc(s.notes)}</textarea></div>`;
  }
  if(s.notes && s.notes.trim()){
    return `<div class="section-label">Instrucciones del día</div><div class="notes-view">${esc(s.notes)}</div>`;
  }
  return '';
}

export function renderGroups(d){
  const s = getState()[d];
  const visibleGroups = s.groups.filter(g => view.editMode || s.mode !== 'minimo' || !g.optional);

  if(s.groups.length === 0 && !view.editMode){
    return `<div class="empty">Este día todavía no tiene grupos cargados.</div>`;
  }
  if(visibleGroups.length === 0 && !view.editMode){
    return `<div class="empty">No hay grupos en modo mínimo: todos son opcionales.</div>`;
  }

  let html = '';
  visibleGroups.forEach(g => {
    const groupIndex = s.groups.indexOf(g);
    html += `<section class="group">`;
    html += renderGroupHead(g, groupIndex, s.groups.length);

    if(g.items.length === 0 && !view.editMode){
      html += `<div class="empty">Sin ejercicios.</div>`;
    }
    g.items.forEach((item, itemIndex) => {
      html += view.editMode
        ? renderItemEditor(g, item, itemIndex, g.items.length)
        : renderItemView(s, g, item);
    });

    if(view.editMode){
      html += `<form class="quick-add" data-form="add-item" data-group="${escAttr(g.id)}">
        <input type="text" name="name" placeholder="Agregar ejercicio…" aria-label="Nombre del nuevo ejercicio" autocomplete="off" enterkeyhint="done">
        <button type="submit" class="quick-add-btn" aria-label="Agregar ejercicio">${icon('plus', 18)}</button>
      </form>`;
    }
    html += `</section>`;
  });

  if(view.editMode){
    html += `<form class="quick-add quick-add-group" data-form="add-group">
      <input type="text" name="name" placeholder="Agregar grupo…" aria-label="Nombre del nuevo grupo" autocomplete="off" enterkeyhint="done">
      <button type="submit" class="quick-add-btn quick-add-btn-wide">${icon('plus', 18)} Agregar</button>
    </form>`;
  }
  return html;
}

function renderGroupHead(g, index, total){
  if(view.editMode){
    const label = g.name || 'Grupo';
    return `<div class="group-head">
      <input class="group-title-input" type="text" value="${escAttr(g.name)}" data-edit="group-name" data-group="${escAttr(g.id)}" placeholder="Nombre del grupo" aria-label="Nombre del grupo">
    </div>
    <div class="group-tools">
      <label class="optional-check" title="Se oculta en modo mínimo">
        <input type="checkbox" data-edit="group-optional" data-group="${escAttr(g.id)}" aria-label="Grupo opcional, se oculta en modo mínimo" ${g.optional ? 'checked' : ''}>
        <span>Opcional</span>
      </label>
      <div class="tool-group">
        <button type="button" class="tool-btn" data-action="move-group" data-group="${escAttr(g.id)}" data-delta="-1" aria-label="Mover ${escAttr(label)} arriba" ${index <= 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="tool-btn" data-action="move-group" data-group="${escAttr(g.id)}" data-delta="1" aria-label="Mover ${escAttr(label)} abajo" ${index >= total - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="tool-btn tool-btn-text" data-action="duplicate-group" data-group="${escAttr(g.id)}" aria-label="Duplicar ${escAttr(label)}">Duplicar</button>
        <button type="button" class="tool-btn danger" data-action="delete-group" data-group="${escAttr(g.id)}" aria-label="Eliminar ${escAttr(label)}" title="Eliminar grupo">${icon('trash', 16)}</button>
      </div>
    </div>
    ${g.optional ? `<p class="group-help">Opcional: se oculta en modo mínimo.</p>` : ''}`;
  }

  return `<div class="group-head">
    <div class="group-name">${esc(g.name)}${g.optional ? '<span class="opt-pill">opcional</span>' : ''}</div>
  </div>`;
}

function renderItemEditor(g, item, index, total){
  const hasMin = hasMinOverride(item);
  const minSteps = item.minSteps == null ? item.steps : item.minSteps;
  const minName = item.minName == null ? item.name : item.minName;
  const label = item.name || 'Ejercicio';

  return `<div class="item item-edit">
    <div class="item-edit-grid">
      <label class="field field-name">
        <span>Ejercicio</span>
        <input type="text" value="${escAttr(item.name)}" data-edit="item-field" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="name" placeholder="Nombre del ejercicio" autocomplete="off">
      </label>
      <div class="field field-steps">
        <span>Series</span>
        <div class="stepper">
          <button type="button" class="stepper-btn" data-action="adjust-item-steps" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="steps" data-delta="-1" aria-label="Restar una serie" ${item.steps <= 1 ? 'disabled' : ''}>−</button>
          <input type="number" min="1" max="${MAX_STEPS}" inputmode="numeric" value="${escAttr(item.steps)}" data-edit="item-field" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="steps" aria-label="Cantidad de series">
          <button type="button" class="stepper-btn" data-action="adjust-item-steps" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="steps" data-delta="1" aria-label="Sumar una serie" ${item.steps >= MAX_STEPS ? 'disabled' : ''}>+</button>
        </div>
      </div>
    </div>

    <details class="min-details" ${hasMin ? 'open' : ''}>
      <summary>Personalizar modo mínimo</summary>
      <label class="check-row">
        <input type="checkbox" data-edit="item-min-override" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" ${hasMin ? 'checked' : ''}>
        <span>Usar nombre y series propios</span>
      </label>
      ${hasMin ? `<div class="item-edit-grid min-grid">
        <label class="field field-name">
          <span>Ejercicio en mínimo</span>
          <input type="text" value="${escAttr(minName)}" data-edit="item-field" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="minName" placeholder="${escAttr(item.name)}" autocomplete="off">
        </label>
        <div class="field field-steps">
          <span>Series en mínimo</span>
          <div class="stepper">
            <button type="button" class="stepper-btn" data-action="adjust-item-steps" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="minSteps" data-delta="-1" aria-label="Restar una serie en modo mínimo" ${minSteps <= 1 ? 'disabled' : ''}>−</button>
            <input type="number" min="1" max="${MAX_STEPS}" inputmode="numeric" value="${escAttr(minSteps)}" data-edit="item-field" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="minSteps" aria-label="Cantidad de series en modo mínimo">
            <button type="button" class="stepper-btn" data-action="adjust-item-steps" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-field="minSteps" data-delta="1" aria-label="Sumar una serie en modo mínimo" ${minSteps >= MAX_STEPS ? 'disabled' : ''}>+</button>
          </div>
        </div>
      </div>` : `<p class="hint">Se usan el mismo nombre y las mismas series que en modo completo.</p>`}
    </details>

    <div class="item-edit-foot">
      <div class="tool-group">
        <button type="button" class="tool-btn" data-action="move-item" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-delta="-1" aria-label="Mover ${escAttr(label)} arriba" ${index <= 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="tool-btn" data-action="move-item" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" data-delta="1" aria-label="Mover ${escAttr(label)} abajo" ${index >= total - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="tool-btn tool-btn-text" data-action="duplicate-item" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" aria-label="Duplicar ${escAttr(label)}">Duplicar</button>
      </div>
      <button type="button" class="delete-link" data-action="delete-item" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" aria-label="Eliminar ${escAttr(label)}">Eliminar</button>
    </div>
  </div>`;
}

function renderItemView(day, g, item){
  const mode = day.mode;
  const text = getItemText(item, mode);
  const steps = getSteps(item, mode);
  const progress = getProgress(item, mode);
  const isDone = steps > 0 && progress >= steps;
  const pct = steps > 0 ? Math.round((progress / steps) * 100) : 0;
  const label = text || 'Sin nombre';

  return `<div class="item ${isDone ? 'done' : ''}">
    <div class="item-row">
      <button type="button" class="item-txt" data-action="bump-step" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" aria-label="Sumar una serie a ${escAttr(label)}">${esc(label)}</button>
      <div class="progress-control">
        <button type="button" class="step-btn" data-action="dec-step" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" aria-label="Restar una serie a ${escAttr(label)}" ${progress <= 0 ? 'disabled' : ''}>−</button>
        <span class="step-count">${progress}/${steps}</span>
        <button type="button" class="step-btn" data-action="inc-step" data-group="${escAttr(g.id)}" data-item="${escAttr(item.id)}" aria-label="Sumar una serie a ${escAttr(label)}" ${progress >= steps ? 'disabled' : ''}>+</button>
      </div>
    </div>
    <div class="progress-track" aria-hidden="true"><span style="width:${pct}%"></span></div>
  </div>`;
}
