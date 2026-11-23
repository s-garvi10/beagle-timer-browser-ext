const DEFAULT = { status: 'idle', duration: 25 * 60000, endTime: 0, remaining: 25 * 60000 };

async function getState() {
  const { timer } = await chrome.storage.local.get('timer');
  return timer || { ...DEFAULT };
}
const setState = (timer) => chrome.storage.local.set({ timer });

function badgeFor(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 60 ? Math.ceil(s / 60) + 'm' : s + 's';
}

async function updateBadge() {
  const t = await getState();
  if (t.status === 'running') {
    await chrome.action.setBadgeBackgroundColor({ color: '#d9372b' });
    await chrome.action.setBadgeText({ text: badgeFor(t.endTime - Date.now()) });
  } else if (t.status === 'paused') {
    await chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
    await chrome.action.setBadgeText({ text: '||' });
  } else if (t.status === 'done') {
    await chrome.action.setBadgeBackgroundColor({ color: '#2e9e5b' });
    await chrome.action.setBadgeText({ text: 'ok' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

async function schedule(endTime) {
  await chrome.alarms.clearAll();
  chrome.alarms.create('finish', { when: endTime });
  chrome.alarms.create('tick', { periodInMinutes: 0.5 });
}

const MAX_MS = 600 * 60000;
let queue = Promise.resolve();

async function handle(msg) {
  if (msg.type === 'start' && !(Number.isFinite(msg.ms) && msg.ms >= 1000 && msg.ms <= MAX_MS)) {
    return getState();
  }
  const t = await getState();
  const now = Date.now();
  if (msg.type === 'start') {
    const ms = msg.ms;
    const next = { status: 'running', duration: ms, endTime: now + ms, remaining: ms };
    await setState(next);
    await schedule(next.endTime);
  } else if (msg.type === 'pause' && t.status === 'running') {
    await chrome.alarms.clearAll();
    await setState({ ...t, status: 'paused', remaining: Math.max(0, t.endTime - now) });
  } else if (msg.type === 'resume' && t.status === 'paused') {
    const next = { ...t, status: 'running', endTime: now + t.remaining };
    await setState(next);
    await schedule(next.endTime);
  } else if (msg.type === 'reset') {
    await chrome.alarms.clearAll();
    await setState({ status: 'idle', duration: t.duration, endTime: 0, remaining: t.duration });
  }
  await updateBadge();
  return getState();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !msg || typeof msg.type !== 'string') return;
  // Run messages one at a time so storage reads/writes cannot interleave.
  queue = queue.then(() => handle(msg)).then(sendResponse, () => getState().then(sendResponse));
  return true;
});

async function finish() {
  const t = await getState();
  if (t.status !== 'running') return;
  await chrome.alarms.clearAll();
  await setState({ ...t, status: 'done', remaining: 0 });
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Time is up!',
    message: 'Your beagle is doing a happy dance. Take a break.'
  });
  await updateBadge();
}

// Alarms do not survive a browser restart, so rebuild them from saved state.
async function reconcile() {
  const t = await getState();
  if (t.status === 'running') {
    if (t.endTime <= Date.now()) await finish();
    else await schedule(t.endTime);
  }
  await updateBadge();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  queue = queue.then(() => (alarm.name === 'finish' ? finish() : updateBadge()));
});

chrome.runtime.onStartup.addListener(() => { queue = queue.then(reconcile); });
chrome.runtime.onInstalled.addListener(() => { queue = queue.then(reconcile); });
