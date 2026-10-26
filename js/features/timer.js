import { TIMER_PRESETS, DEFAULT_TIMER, MAX_TIMER_SECONDS } from '../config.js';
import { formatDuration, remainingFromDeadline } from '../utils/time.js';

const TICK_MS = 250;

let totalSeconds = DEFAULT_TIMER;
let remaining = DEFAULT_TIMER;
let endAt = 0;
let ticker = null;
let running = false;
let audioCtx = null;

const $ = (id) => document.getElementById(id);

function updateDisplay(){
  $('timerDisplay').textContent = formatDuration(remaining);
}

function computeRemaining(){
  return remainingFromDeadline(endAt, Date.now());
}

function stopTicker(){
  if(ticker) clearInterval(ticker);
  ticker = null;
}

function startTicker(){
  stopTicker();
  ticker = setInterval(tick, TICK_MS);
}

function tick(){
  remaining = computeRemaining();
  updateDisplay();
  if(remaining <= 0) finishTimer();
}

function finishTimer(){
  stopTicker();
  running = false;
  remaining = 0;
  updateDisplay();
  $('startBtn').textContent = 'Iniciar';
  playBeep();
}

function selectPreset(value, btn){
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  totalSeconds = value;
  resetTimer();
}

function setCustom(){
  const parsed = parseInt($('customSec').value, 10);
  if(!Number.isFinite(parsed) || parsed <= 0) return;
  const value = Math.min(parsed, MAX_TIMER_SECONDS);
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
  totalSeconds = value;
  resetTimer();
}

function toggleTimer(){
  if(running){
    remaining = computeRemaining();
    stopTicker();
    running = false;
    $('startBtn').textContent = 'Reanudar';
    updateDisplay();
    return;
  }

  if(remaining <= 0) remaining = totalSeconds;
  endAt = Date.now() + remaining * 1000;
  running = true;
  $('startBtn').textContent = 'Pausar';
  updateDisplay();
  startTicker();
}

function resetTimer(){
  stopTicker();
  running = false;
  remaining = totalSeconds;
  endAt = 0;
  $('startBtn').textContent = 'Iniciar';
  updateDisplay();
}

function onVisibilityChange(){
  if(document.hidden){
    if(running) stopTicker();
  } else if(running){
    tick();
    if(running) startTicker();
  }
}

function playBeep(){
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!audioCtx && AudioCtx) audioCtx = new AudioCtx();
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    for(let i = 0; i < 3; i++){
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      const start = audioCtx.currentTime + i * 0.35;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.start(start);
      osc.stop(start + 0.3);
    }
  } catch(e){
    /* sin audio disponible: el aviso visual y la vibración siguen funcionando */
  }
  if(navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  flashTimerBox();
}

function flashTimerBox(){
  const box = document.querySelector('.timer-box');
  if(!box) return;
  let count = 0;
  const fi = setInterval(() => {
    box.classList.toggle('flash');
    count++;
    if(count >= 6){
      clearInterval(fi);
      box.classList.remove('flash');
    }
  }, 250);
}

export function initTimer(){
  const presetsEl = $('presets');
  TIMER_PRESETS.forEach(v => {
    const b = document.createElement('button');
    b.className = 'preset-btn' + (v === DEFAULT_TIMER ? ' selected' : '');
    b.textContent = `${v}s`;
    b.onclick = () => selectPreset(v, b);
    presetsEl.appendChild(b);
  });

  $('customBtn').onclick = setCustom;
  $('startBtn').onclick = toggleTimer;
  $('resetTimerBtn').onclick = resetTimer;

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', stopTicker);
  window.addEventListener('pageshow', () => {
    if(running){
      tick();
      if(running) startTicker();
    }
  });

  updateDisplay();
}
