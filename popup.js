const $ = (id) => document.getElementById(id);
const app = $('app'), timeEl = $('time'), captionEl = $('caption'), mainBtn = $('main');
let state = { status: 'idle', duration: 25 * 60000, endTime: 0, remaining: 25 * 60000 };
let chosenMs = 25 * 60000;

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(r).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const captions = {
  idle: 'Pick a time and start.',
  running: 'Focus. The beagle is studying too.',
  paused: 'Paused. Resume when ready.',
  done: 'Time is up! Take a break.'
};
const nightCaptions = {
  idle: 'Cap on, book open. Pick a time.',
  running: 'Quiet hours. Keep reading.',
  paused: 'Paused. Pillow break.',
  done: 'Time is up! Time to rest.'
};

function render() {
  app.dataset.state = state.status;
  captionEl.textContent = (document.documentElement.dataset.theme === 'night' ? nightCaptions : captions)[state.status];
  let ms = chosenMs;
  if (state.status === 'running') ms = state.endTime - Date.now();
  else if (state.status === 'paused') ms = state.remaining;
  else if (state.status === 'done') ms = 0;
  timeEl.textContent = fmt(ms);
  mainBtn.textContent = { idle: 'Start', running: 'Pause', paused: 'Resume', done: 'Start again' }[state.status];
  document.title = `${timeEl.textContent} - Beagle Timer`;
}

const send = async (msg) => { state = await chrome.runtime.sendMessage(msg); render(); };

mainBtn.addEventListener('click', () => {
  if (state.status === 'running') send({ type: 'pause' });
  else if (state.status === 'paused') send({ type: 'resume' });
  else send({ type: 'start', ms: state.status === 'done' ? state.duration : chosenMs });
});
$('reset').addEventListener('click', async () => {
  await send({ type: 'reset' });
  chosenMs = state.duration; render();
});

function choose(ms, btn) {
  chosenMs = ms;
  document.querySelectorAll('.presets button').forEach((b) => b.classList.toggle('on', b === btn));
  render();
}
document.querySelectorAll('.presets button').forEach((b) =>
  b.addEventListener('click', () => { $('custom').value = ''; choose(+b.dataset.min * 60000, b); }));
$('custom').addEventListener('input', (e) => {
  const n = parseFloat(e.target.value);
  if (!Number.isFinite(n) || n <= 0) return;
  choose(Math.min(600, Math.max(1, n)) * 60000, null);
});


// ---------- character customization ----------
const COATS = [
  { name: 'Classic beagle', ear: '#8a4b2a', patch: '#d9a066' },
  { name: 'Chocolate', ear: '#5a3320', patch: '#8a5a3a' },
  { name: 'Black and tan', ear: '#2f2a2a', patch: '#c98a4a' },
  { name: 'Golden', ear: '#c98a3a', patch: '#e8c07a' },
  { name: 'Gray', ear: '#7b8591', patch: '#b8c0c9' },
  { name: 'Cream', ear: '#e0d2bd', patch: '#f3e8d6' }
];
const ACC = [['Indigo', '#5b6bd6'], ['Red', '#d9372b'], ['Green', '#3fa66b'], ['Yellow', '#f2c230'], ['Pink', '#f27ba5'], ['Black', '#2f2f3a']];
const BLANKETS = [['Pink', '#f2a6bd'], ['Sky blue', '#8ec5f0'], ['Mint', '#9fdcb8'], ['Butter', '#f6d98a']];
const BOOKS = [['Blue', '#3b6fb6'], ['Red', '#c8453b'], ['Green', '#3f9a63'], ['Purple', '#7a5cc7']];
const DEFAULT_LOOK = {
  ear: '#8a4b2a', patch: '#d9a066', acc: '#5b6bd6', blanket: '#f2a6bd', book: '#3b6fb6',
  hat: 'auto', glasses: 'none', neck: 'none', pillow: 'night', blanketShow: 'night', bookShow: 'on'
};
const SELECTS = { selHat: 'hat', selGlasses: 'glasses', selNeck: 'neck', selPillow: 'pillow', selBlanket: 'blanketShow', selBook: 'bookShow' };
const HEX = /^#[0-9a-f]{6}$/i;
let look = { ...DEFAULT_LOOK };

function applyLook() {
  const night = document.documentElement.dataset.theme === 'night';
  app.style.setProperty('--ear', look.ear);
  app.style.setProperty('--patch', look.patch);
  app.style.setProperty('--acc', look.acc);
  app.style.setProperty('--blanket', look.blanket);
  app.style.setProperty('--book', look.book);
  app.dataset.hat = look.hat === 'auto' ? (night ? 'night' : 'none') : look.hat;
  app.dataset.glasses = look.glasses;
  app.dataset.neck = look.neck;
  const show = (v) => (v === 'on' || (v === 'night' && night) ? 'on' : 'off');
  app.dataset.pillow = show(look.pillow);
  app.dataset.blanket = show(look.blanketShow);
  app.dataset.book = look.bookShow === 'off' ? 'off' : 'on';
}

function saveLook() { chrome.storage.local.set({ look }); applyLook(); syncControls(); }

function makeSwatches(id, items, isPressed, onPick) {
  const box = $(id);
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sw';
    b.setAttribute('aria-label', item.name || item[0]);
    b.title = item.name || item[0];
    b.style.setProperty('--c', item.ear ? `linear-gradient(135deg, ${item.ear} 50%, ${item.patch} 50%)` : item[1]);
    b.addEventListener('click', () => onPick(item));
    b._pressed = () => isPressed(item);
    box.appendChild(b);
  });
}

function buildControls() {
  makeSwatches('coatSw', COATS, (c) => c.ear === look.ear && c.patch === look.patch, (c) => { look.ear = c.ear; look.patch = c.patch; saveLook(); });
  makeSwatches('accSw', ACC, (c) => c[1] === look.acc, (c) => { look.acc = c[1]; saveLook(); });
  makeSwatches('blanketSw', BLANKETS, (c) => c[1] === look.blanket, (c) => { look.blanket = c[1]; saveLook(); });
  makeSwatches('bookSw', BOOKS, (c) => c[1] === look.book, (c) => { look.book = c[1]; saveLook(); });
  Object.entries(SELECTS).forEach(([id, key]) =>
    $(id).addEventListener('change', (e) => { look[key] = e.target.value; saveLook(); }));
  $('earInput').addEventListener('input', (e) => { look.ear = e.target.value; saveLook(); });
  $('patchInput').addEventListener('input', (e) => { look.patch = e.target.value; saveLook(); });
  $('resetLook').addEventListener('click', () => { look = { ...DEFAULT_LOOK }; saveLook(); });
  $('customBtn').addEventListener('click', () => {
    const open = $('customPanel').hidden;
    $('customPanel').hidden = !open;
    $('timerPanel').hidden = open;
    $('customBtn').textContent = open ? 'Back to timer' : 'Customize character';
    $('customBtn').setAttribute('aria-expanded', String(open));
  });
}

function syncControls() {
  document.querySelectorAll('.sw').forEach((b) => b.setAttribute('aria-pressed', String(b._pressed())));
  Object.entries(SELECTS).forEach(([id, key]) => { $(id).value = look[key]; });
  $('earInput').value = look.ear;
  $('patchInput').value = look.patch;
}

function sanitizeLook(saved) {
  const out = { ...DEFAULT_LOOK };
  if (!saved || typeof saved !== 'object') return out;
  ['ear', 'patch', 'acc', 'blanket', 'book'].forEach((k) => { if (HEX.test(saved[k])) out[k] = saved[k]; });
  const allowed = {
    hat: ['auto', 'none', 'night', 'beanie', 'party', 'grad', 'bow'], glasses: ['none', 'round', 'shades'],
    neck: ['none', 'scarf', 'bowtie', 'collar'], pillow: ['night', 'on', 'off'],
    blanketShow: ['night', 'on', 'off'], bookShow: ['on', 'off']
  };
  Object.keys(allowed).forEach((k) => { if (allowed[k].includes(saved[k])) out[k] = saved[k]; });
  return out;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('night').checked = theme === 'night';
  applyLook();
  render();
}
$('night').addEventListener('change', (e) => {
  const theme = e.target.checked ? 'night' : 'day';
  chrome.storage.local.set({ theme });
  applyTheme(theme);
});

$('sound').addEventListener('change', (e) => chrome.storage.local.set({ sound: e.target.checked }));

(async function init() {
  const { theme, sound, look: savedLook } = await chrome.storage.local.get(['theme', 'sound', 'look']);
  look = sanitizeLook(savedLook);
  buildControls();
  syncControls();
  $('sound').checked = sound !== false;
  applyTheme(theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'));
  const { timer } = await chrome.storage.local.get('timer');
  if (timer) { state = timer; chosenMs = timer.duration; }
  const match = [...document.querySelectorAll('.presets button')].find((b) => +b.dataset.min * 60000 === chosenMs);
  document.querySelectorAll('.presets button').forEach((b) => b.classList.toggle('on', b === match));
  render();
  setInterval(async () => {
    const { timer: t } = await chrome.storage.local.get('timer');
    if (t) state = t;
    render();
  }, 250);
})();
