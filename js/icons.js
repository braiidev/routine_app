export const ICON_PATHS = {
  menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  chart: '<line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="12" width="3" height="8"/><rect x="11" y="8" width="3" height="12"/><rect x="16" y="4" width="3" height="16"/>',
  refresh: '<path d="M4 4v5h5"/><path d="M20 20v-5h-5"/><path d="M5 9a7 7 0 0 1 12-4l3 3"/><path d="M19 15a7 7 0 0 1-12 4l-3-3"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  star: '<polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/>',
  check: '<circle cx="12" cy="12" r="9"/><polyline points="9 12 11 14 15 10"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  barbell: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="3" y1="10" x2="3" y2="14"/><line x1="21" y1="10" x2="21" y2="14"/>'
};

export function icon(name, size=18, filled=false){
  const fill = filled ? 'currentColor' : 'none';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px">${ICON_PATHS[name]||''}</svg>`;
}
