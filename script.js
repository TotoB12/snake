const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const message = document.getElementById('message');
const submessage = document.getElementById('submessage');
const overlayButton = document.getElementById('overlayButton');
const playButton = document.getElementById('playButton');
const restartButton = document.getElementById('restartButton');
const speedSelect = document.getElementById('speed');
const wrapInput = document.getElementById('wrap');
const soundInput = document.getElementById('sound');
const statusEl = document.getElementById('status');

const gridSize = 20;
const tileCount = canvas.width / gridSize;
const speeds = { slow: 160, normal: 105, fast: 70 };
const directions = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
};

let snake, apple, velocity, turns, score, best, state;
let frameId = 0;
let lastStep = 0;
let audio;

// Storage can be unavailable (private browsing, browser settings, etc.).
function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Still playable. */ }
}
function bestKey() { return `snake-best-${speedSelect.value}-${wrapInput.checked}`; }

function placeApple() {
  const empty = [];
  const occupied = new Set(snake.map(part => part.y * tileCount + part.x));
  for (let y = 0; y < tileCount; y++) {
    for (let x = 0; x < tileCount; x++) {
      if (!occupied.has(y * tileCount + x)) empty.push({ x, y });
    }
  }
  return empty.length ? empty[Math.floor(Math.random() * empty.length)] : null;
}

function draw() {
  for (let y = 0; y < tileCount; y++) {
    for (let x = 0; x < tileCount; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#666' : '#555';
      ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
    }
  }
  ctx.fillStyle = '#0f0';
  for (const part of snake) {
    ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2);
  }
  if (apple) {
    ctx.fillStyle = '#f00';
    ctx.fillRect(apple.x * gridSize, apple.y * gridSize, gridSize - 2, gridSize - 2);
  }
}

function updateUi() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  overlay.hidden = state === 'running';
  playButton.textContent = ({ ready: 'Play', running: 'Pause', paused: 'Resume', over: 'Restart', won: 'Restart' })[state];
  if (state !== 'running') {
    message.textContent = ({ ready: 'Ready?', paused: 'Paused', over: 'Game over', won: 'You win!' })[state];
    submessage.textContent = state === 'ready' ? 'Arrow keys, WASD, or swipe to move'
      : state === 'paused' ? 'Press Space or resume to continue'
      : `Score: ${score}`;
    overlayButton.textContent = state === 'ready' ? 'Play' : state === 'paused' ? 'Resume' : 'Play again';
  }
  statusEl.textContent = ({ ready: 'Ready to play', running: 'Playing', paused: 'Paused', over: 'Game over', won: 'You win!' })[state];
}

function reset() {
  cancelAnimationFrame(frameId);
  frameId = 0;
  const center = Math.floor(tileCount / 2);
  snake = [{ x: center, y: center }, { x: center - 1, y: center }, { x: center - 2, y: center }];
  velocity = directions.right;
  turns = [];
  score = 0;
  best = Number(read(bestKey())) || 0;
  apple = placeApple();
  state = 'ready';
  draw();
  updateUi();
}

function beep(frequency, duration) {
  if (!soundInput.checked) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch { /* Audio is optional. */ }
}

function finish(won = false) {
  cancelAnimationFrame(frameId);
  frameId = 0;
  state = won ? 'won' : 'over';
  beep(won ? 660 : 180, 0.18);
  updateUi();
}

function step() {
  if (turns.length) velocity = turns.shift();
  const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

  if (wrapInput.checked) {
    head.x = (head.x + tileCount) % tileCount;
    head.y = (head.y + tileCount) % tileCount;
  } else if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    finish();
    return;
  }

  const eating = apple && head.x === apple.x && head.y === apple.y;
  // Moving into the current tail position is legal, unless the snake grows.
  const body = eating ? snake : snake.slice(0, -1);
  if (body.some(part => part.x === head.x && part.y === head.y)) {
    finish();
    return;
  }

  snake.unshift(head);
  if (eating) {
    score++;
    if (score > best) { best = score; save(bestKey(), best); }
    scoreEl.textContent = score;
    bestEl.textContent = best;
    beep(620, 0.07);
    if (snake.length === tileCount * tileCount) {
      apple = null;
      draw();
      finish(true);
      return;
    }
    apple = placeApple();
  } else {
    snake.pop();
  }
  draw();
}

function loop(now) {
  if (state !== 'running') return;
  const interval = speeds[speedSelect.value];
  if (now - lastStep >= interval) {
    // Avoid a burst of catch-up moves when returning to the tab.
    lastStep = now;
    step();
  }
  if (state === 'running') frameId = requestAnimationFrame(loop);
}

function resume() {
  if (state === 'running') return;
  if (state === 'over' || state === 'won') reset();
  state = 'running';
  lastStep = performance.now();
  updateUi();
  frameId = requestAnimationFrame(loop);
}

function pause() {
  if (state !== 'running') return;
  state = 'paused';
  cancelAnimationFrame(frameId);
  frameId = 0;
  updateUi();
}

function playOrPause() {
  if (state === 'running') pause();
  else resume();
}

function steer(next) {
  if (state === 'over' || state === 'won') reset();
  if (state === 'ready') {
    // On the first move, allow any direction and line the body up behind it.
    velocity = next;
    snake = snake.map((part, i) => ({ x: snake[0].x - next.x * i, y: snake[0].y - next.y * i }));
    if (snake.some(part => part.x === apple.x && part.y === apple.y)) apple = placeApple();
    draw();
    resume();
    return;
  }
  const previous = turns.length ? turns[turns.length - 1] : velocity;
  if (next.x === -previous.x && next.y === -previous.y) return;
  if (next.x === previous.x && next.y === previous.y) return;
  if (turns.length < 2) turns.push(next);
  if (state === 'paused') resume();
}

const keys = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right'
};
document.addEventListener('keydown', event => {
  // Keep native controls usable with a keyboard.
  if (event.target instanceof Element && event.target.closest('input, select')) return;
  if (event.target instanceof Element && event.target.closest('button') && event.code === 'Space') return;
  const direction = keys[event.key] || keys[event.key.toLowerCase()];
  if (direction) {
    event.preventDefault();
    if (!event.repeat) steer(directions[direction]);
  } else if (event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat) playOrPause();
  } else if (event.key.toLowerCase() === 'r') {
    reset();
    resume();
  }
});

let touchStart = null;
const board = document.getElementById('board');
board.addEventListener('touchstart', event => {
  if (event.target.closest('button')) return;
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
board.addEventListener('touchend', event => {
  if (!touchStart || event.target.closest('button')) { touchStart = null; return; }
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  steer(Math.abs(dx) > Math.abs(dy) ? directions[dx > 0 ? 'right' : 'left'] : directions[dy > 0 ? 'down' : 'up']);
}, { passive: true });
board.addEventListener('touchcancel', () => { touchStart = null; });

document.querySelectorAll('[data-direction]').forEach(button => {
  button.addEventListener('click', () => steer(directions[button.dataset.direction]));
});
playButton.addEventListener('click', playOrPause);
restartButton.addEventListener('click', () => { reset(); resume(); });
overlayButton.addEventListener('click', playOrPause);
speedSelect.addEventListener('change', reset);
wrapInput.addEventListener('change', reset);
soundInput.checked = read('snake-sound') === 'on';
soundInput.addEventListener('change', () => save('snake-sound', soundInput.checked ? 'on' : 'off'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

reset();
