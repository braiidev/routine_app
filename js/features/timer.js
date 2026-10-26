import { TIMER_PRESETS, DEFAULT_TIMER } from '../config.js';

let totalSeconds = DEFAULT_TIMER;
let remaining = DEFAULT_TIMER;
let timerInterval = null;
let running = false;
let audioCtx = null;

const $ = (id) => document.getElementById(id);

function updateDisplay(){
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  $('timerDisplay').textContent = `${m}:${s}`;
}

function selectPreset(value, btn){
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  totalSeconds = value;
  resetTimer();
}

function setCustom(){
  const val = parseInt($('customSec').value, 10);
  if(val && val > 0){
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    totalSeconds = val;
    resetTimer();
  }
}

function toggleTimer(){
  if(running){
    clearInterval(timerInterval);
    running = false;
    $('startBtn').textContent = 'Reanudar';
    return;
  }

  if(remaining <= 0){
    remaining = totalSeconds;
    updateDisplay();
  }

  running = true;
  $('startBtn').textContent = 'Pausar';
  timerInterval = setInterval(() => {
    remaining--;
    updateDisplay();
    if(remaining <= 0){
      clearInterval(timerInterval);
      running = false;
      $('startBtn').textContent = 'Iniciar';
      playBeep();
    }
  }, 1000);
}

function resetTimer(){
  clearInterval(timerInterval);
  running = false;
  remaining = totalSeconds;
  $('startBtn').textContent = 'Iniciar';
  updateDisplay();
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
  window.addEventListener('pagehide', disposeTimer);
  updateDisplay();
}

export function disposeTimer(){
  if(timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  running = false;
}
