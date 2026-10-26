export function esc(str){
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

export function escAttr(str){
  return esc(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function uid(){
  return Math.random().toString(36).slice(2,9);
}
