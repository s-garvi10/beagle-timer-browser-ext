let ctx;
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== chrome.runtime.id || !msg || msg.target !== 'offscreen') return;
  if (msg.sound !== 'chime' && msg.sound !== 'woof') return;
  ctx = ctx || new AudioContext();
  ctx.resume().then(() => Sounds[msg.sound](ctx));
});
