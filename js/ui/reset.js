import { resetProgress } from '../features/actions.js';
import { getState } from '../state/store.js';
import { view } from '../state/view.js';
import { esc } from '../utils/dom.js';
import { showToast } from './toast.js';

function modeLabel(mode){
  return mode === 'minimo' ? 'mínimo' : 'completo';
}

export function openResetSheet(){
  if(document.getElementById('resetSheet')) return;

  const day = getState()[view.activeDay];
  const mode = modeLabel(day.mode);
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.id = 'resetSheet';
  backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="resetSheetTitle" aria-describedby="resetSheetHelp">
    <div class="sheet-head">
      <div>
        <h2 class="sheet-title" id="resetSheetTitle">Reiniciar ${esc(day.title)}</h2>
        <p class="sheet-help" id="resetSheetHelp">Los checks de hoy se ponen en cero. El historial no se borra.</p>
      </div>
      <button type="button" class="sheet-close" data-reset-close aria-label="Cerrar">×</button>
    </div>
    <button type="button" class="sheet-option" data-reset-scope="current">
      <span class="sheet-option-title">Solo modo ${esc(mode)}</span>
      <span class="sheet-option-help">Limpia los checks del modo que estás usando.</span>
    </button>
    <button type="button" class="sheet-option" data-reset-scope="both">
      <span class="sheet-option-title">Ambos modos</span>
      <span class="sheet-option-help">Limpia completo y mínimo a la vez.</span>
    </button>
    <button type="button" class="sheet-cancel" data-reset-close>Cancelar</button>
  </div>`;

  let closed = false;
  const focusables = () => Array.from(backdrop.querySelectorAll('button'));

  function close(){
    if(closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    const fab = document.getElementById('fabBtn');
    if(fab) fab.focus();
  }

  function onKey(e){
    if(e.key === 'Escape'){
      e.preventDefault();
      close();
      return;
    }
    if(e.key !== 'Tab') return;
    const items = focusables();
    if(items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    } else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  }

  backdrop.addEventListener('click', (e) => {
    if(e.target === backdrop || e.target.closest('[data-reset-close]')){
      close();
      return;
    }

    const option = e.target.closest('[data-reset-scope]');
    if(!option) return;

    const scope = option.dataset.resetScope;
    close();
    const result = resetProgress(scope);
    const label = scope === 'both' ? 'en ambos modos' : `en modo ${modeLabel(result.mode)}`;
    showToast(`Día reiniciado ${label}`, { duration: 2200 });
  });

  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  const firstOption = backdrop.querySelector('[data-reset-scope="current"]');
  if(firstOption) firstOption.focus();
}
