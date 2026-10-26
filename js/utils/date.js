export function getLocalISODate(d = new Date()){
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Convierte 'YYYY-MM-DD' en una fecha local.
 * Evita que new Date('YYYY-MM-DD') la interprete como UTC y muestre el día anterior.
 */
export function parseLocalISODate(str){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
  if(!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
