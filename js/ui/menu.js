export const RESET_LABEL = 'Reiniciar sesión…';

function menuElements(){
  return {
    fabBtn: document.getElementById('fabBtn'),
    fabMenu: document.getElementById('fabMenu')
  };
}

function setMenuOpen(open){
  const { fabBtn, fabMenu } = menuElements();
  if(fabMenu) fabMenu.classList.toggle('open', open);
  if(fabBtn) fabBtn.setAttribute('aria-expanded', String(open));
}

export function closeMenu(){
  setMenuOpen(false);
}

export function initMenu(){
  const { fabBtn, fabMenu } = menuElements();
  if(!fabBtn || !fabMenu) return;

  setMenuOpen(false);

  fabBtn.onclick = (e) => {
    e.stopPropagation();
    setMenuOpen(!fabMenu.classList.contains('open'));
  };

  document.addEventListener('click', (e) => {
    if(!fabMenu.contains(e.target) && !fabBtn.contains(e.target)){
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && fabMenu.classList.contains('open')){
      e.preventDefault();
      closeMenu();
      fabBtn.focus();
    }
  });
}
