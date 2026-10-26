let hideTimer = null;

function ensureToast(){
  let el = document.getElementById('toast');
  if(!el){
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

function hideToast(){
  const el = document.getElementById('toast');
  if(el) el.classList.remove('show');
}

export function showToast(message, { actionLabel, onAction, duration = 3200, error = false } = {}){
  const el = ensureToast();
  el.classList.toggle('error', error);
  el.innerHTML = '';

  const text = document.createElement('span');
  text.textContent = message;
  el.appendChild(text);

  if(actionLabel && onAction){
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = actionLabel;
    button.onclick = () => {
      hideToast();
      onAction();
    };
    el.appendChild(button);
  }

  el.classList.add('show');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideToast, duration);
}
