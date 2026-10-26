import { icon } from '../icons.js';
import { view } from '../state/view.js';

export const RESET_LABEL = 'Reiniciar checks del día';

export function resetMenuButton(){
  const btn = document.getElementById('resetMenuBtn');
  if(btn) btn.innerHTML = icon('refresh', 18) + ' ' + RESET_LABEL;
}

export function closeMenu(){
  const menu = document.getElementById('fabMenu');
  if(menu) menu.classList.remove('open');
  view.pendingResetDay = false;
  resetMenuButton();
}

export function initMenu(){
  const fabBtn = document.getElementById('fabBtn');
  const fabMenu = document.getElementById('fabMenu');

  fabBtn.onclick = (e) => {
    e.stopPropagation();
    fabMenu.classList.toggle('open');
  };

  document.addEventListener('click', (e) => {
    if(!fabMenu.contains(e.target) && !fabBtn.contains(e.target)){
      fabMenu.classList.remove('open');
    }
  });
}
