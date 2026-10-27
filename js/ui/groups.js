import { MAX_STEPS } from '../config.js';
import { icon } from '../icons.js';
import { getItemText, getSteps, hasMinOverride } from '../state/selectors.js';
import { esc, escAttr } from '../utils/dom.js';

export function renderNotes(day, editable = false){
  if(!day) return '';
  if(editable){
    return `<div class="section-label">Instrucciones del día</div>
      <div class="notes"><textarea data-edit="notes" placeholder="Ej.: calentar 10 minutos, descansar 90 segundos entre series.">${esc(day.notes)}</textarea></div>`;
  }
  if(day.notes && day.notes.trim()){
    return `<div class="section-label">Instrucciones del día</div><div class="notes-view">${esc(day.notes)}</div>`;
  }
  return '';
}

/* ------------------------------------------------------------------ */
/* Editor de la plantilla                                              */
/* ------------------------------------------------------------------ */

export function renderEditorGroups(day){
  if(!day) return '';

  if(day.groups.length === 0){
    return `<div class="empty">Este día todavía no tiene grupos cargados.</div>
      ${renderAddGroupForm()}`;
  }

  let html = '';
  day.groups.forEach(g => {
    const groupIndex = day.groups.indexOf(g);
    html += `<section class="group">`;
    html += renderGroupHead(g, groupIndex, day.groups.length);

    if(g.items.length === 0){
      html += `<div class="empty">Sin ejercicios.</div>`;
    }
    g.items.forEach((item, itemIndex) => {
      html += renderItemEditor(g, item, itemIndex, g.items.length);
    });

    html += `<form class="quick-add" data-form="add-item" data-group="${escAttr(g.id)}">
      <input type="text" name="name" placeholder="Agregar ejercicio…" aria-label="Nombre del nuevo ejercicio" autocomplete="off" enterkeyhint="done">
      <button type="submit" class="quick-add-btn" aria-label="Agregar ejercicio">${icon('plus', 18)}</button>
    </form>
    </section>`;
  });

  html += renderAddGroupForm();
  return html;
}

function renderAddGroupForm(){
  return `<form class="quick-add quick-add-group" data-form="add-group">
    <input type="text" name="name" placeholder="Agregar grupo…" aria-label="Nombre del nuevo grupo" autocomplete="off" enterkeyhint="done">
    <button type="submit" class="quick-add-btn quick-add-btn-wide">${icon('plus', 18)} Agregar</button>
  </form>`;
}

function renderGroupHead(g, index, total){
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

/* ------------------------------------------------------------------ */
/* Sesión diaria y vista previa                                        */
/* ------------------------------------------------------------------ */

export function renderSessionGroups(session, options = {}){
  const { editable = false, date = session?.date || '', allowPast = false } = options;
  const groups = Array.isArray(session?.groups) ? session.groups : [];

  if(groups.length === 0){
    return `<div class="empty">No hay ejercicios para este modo.</div>`;
  }

  let html = '';
  groups.forEach(group => {
    html += `<section class="group">
      <div class="group-head">
        <div class="group-name">${esc(group.name)}${group.optional ? '<span class="opt-pill">opcional</span>' : ''}</div>
      </div>`;
    if(group.items.length === 0){
      html += `<div class="empty">Sin ejercicios.</div>`;
    }
    group.items.forEach(item => {
      html += renderSessionItem(item, {
        editable,
        date,
        allowPast,
        groupId: group.id
      });
    });
    html += `</section>`;
  });
  return html;
}

function renderSessionItem(item, { editable, date, allowPast, groupId }){
  const steps = item.steps || 0;
  const done = Math.min(item.done || 0, steps);
  const isDone = steps > 0 && done >= steps;
  const pct = steps > 0 ? Math.round((done / steps) * 100) : 0;
  const label = item.text || 'Sin nombre';
  const common = `data-date="${escAttr(date)}" data-group="${escAttr(groupId)}" data-item="${escAttr(item.id)}" data-past="${allowPast ? '1' : '0'}"`;
  const doneText = `${done}/${steps}`;

  if(!editable){
    return `<div class="item ${isDone ? 'done' : ''}">
      <div class="item-row">
        <div class="item-txt">${icon(isDone ? 'check' : 'circle', 15)} <span>${esc(label)}</span></div>
        <span class="step-count">${doneText}</span>
      </div>
      <div class="progress-track" aria-hidden="true"><span style="width:${pct}%"></span></div>
    </div>`;
  }

  return `<div class="item ${isDone ? 'done' : ''}">
    <div class="item-row">
      <button type="button" class="item-txt" data-action="session-bump" ${common} aria-label="Sumar una serie a ${escAttr(label)}">${esc(label)}</button>
      <div class="progress-control">
        <button type="button" class="step-btn" data-action="session-dec" ${common} aria-label="Restar una serie a ${escAttr(label)}" ${done <= 0 ? 'disabled' : ''}>−</button>
        <span class="step-count">${doneText}</span>
        <button type="button" class="step-btn" data-action="session-inc" ${common} aria-label="Sumar una serie a ${escAttr(label)}" ${done >= steps ? 'disabled' : ''}>+</button>
      </div>
    </div>
    <div class="progress-track" aria-hidden="true"><span style="width:${pct}%"></span></div>
  </div>`;
}

export function renderTemplatePreview(day, mode){
  if(!day) return '';
  const groups = (day.groups || []).filter(g => mode !== 'minimo' || !g.optional);

  if(day.groups.length === 0){
    return `<div class="empty">Este día todavía no tiene grupos cargados.</div>`;
  }
  if(groups.length === 0){
    return `<div class="empty">No hay grupos en modo mínimo: todos son opcionales.</div>`;
  }

  let html = '';
  groups.forEach(group => {
    html += `<section class="group">
      <div class="group-head">
        <div class="group-name">${esc(group.name)}${group.optional ? '<span class="opt-pill">opcional</span>' : ''}</div>
      </div>`;
    group.items.forEach(item => {
      const text = getItemText(item, mode);
      const steps = getSteps(item, mode);
      html += `<div class="item item-preview">
        <div class="item-row">
          <div class="item-txt">${esc(text)}</div>
          <span class="step-count">${steps} ${steps === 1 ? 'serie' : 'series'}</span>
        </div>
      </div>`;
    });
    html += `</section>`;
  });
  return html;
}
