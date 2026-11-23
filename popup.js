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
  running: 'Focus. The beagle is wagging.',
  paused: 'Paused. Resume when ready.',
  done: 'Time is up! Take a break.'
};

function render() {
  app.dataset.state = state.status;
  captionEl.textContent = captions[state.status];
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

(async function init() {
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
