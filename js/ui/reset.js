import { resetToday } from '../features/actions.js';
import { getSession } from '../state/selectors.js';
import { getState } from '../state/store.js';
import { getLocalISODate, formatDateLong } from '../utils/date.js';
import { esc } from '../utils/dom.js';
import { showToast } from './toast.js';

export function openResetSheet(){
  if(document.getElementById('resetSheet')) return;

  const today = getLocalISODate();
  const session = getSession(getState(), today);
  if(!session){
    showToast('Hoy todavía no tiene una sesión para reiniciar', { duration: 2600 });
    return;
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.id = 'resetSheet';
  backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="resetSheetTitle" aria-describedby="resetSheetHelp">
    <div class="sheet-head">
      <div>
        <h2 class="sheet-title" id="resetSheetTitle">Reiniciar sesión de hoy</h2>
        <p class="sheet-help" id="resetSheetHelp">${esc(formatDateLong(today))}. Se borran los checks de hoy. Si estaba completa, dejará de contar en el historial y en la racha.</p>
      </div>
      <button type="button" class="sheet-close" data-reset-close aria-label="Cerrar">×</button>
    </div>
    <button type="button" class="sheet-option danger-option" data-reset-confirm>
      <span class="sheet-option-title">Reiniciar sesión</span>
      <span class="sheet-option-help">La plantilla del día no cambia.</span>
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
    if(!e.target.closest('[data-reset-confirm]')) return;

    close();
    if(resetToday()) showToast('Sesión de hoy reiniciada', { duration: 2400 });
    else showToast('No se pudo reiniciar la sesión', { error: true });
  });

  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  const confirm = backdrop.querySelector('[data-reset-confirm]');
  if(confirm) confirm.focus();
}
