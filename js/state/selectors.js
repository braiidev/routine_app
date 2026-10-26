export function hasMinOverride(item){
  return item.minName != null || item.minSteps != null;
}

export function getSteps(item, mode){
  if(mode === 'minimo' && item.minSteps != null) return item.minSteps;
  return item.steps;
}

export function getProgress(item, mode){
  const p = item.progress && item.progress[mode];
  return Number.isFinite(p) ? p : 0;
}

export function getItemText(item, mode){
  if(mode === 'minimo' && item.minName != null && item.minName !== '') return item.minName;
  return item.name;
}

export function consideredGroups(state, d, mode){
  const day = state[d];
  if(!day) return [];
  return mode === 'minimo' ? day.groups.filter(g => !g.optional) : day.groups;
}

export function isFinished(state, d, mode){
  const items = consideredGroups(state, d, mode).flatMap(g => g.items);
  if(items.length === 0) return false;
  return items.every(it => {
    const steps = getSteps(it, mode);
    return steps > 0 && getProgress(it, mode) >= steps;
  });
}
