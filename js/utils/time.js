export function formatDuration(totalSeconds){
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60).toString().padStart(2, '0');
  const s = (safe % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function remainingFromDeadline(endAt, now){
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}
