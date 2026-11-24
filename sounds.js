// Synthesized with the Web Audio API, so no audio files are needed.
const Sounds = (() => {
  // Soft three-note bell, rising: E5, A5, E6.
  function chime(ctx, t0 = ctx.currentTime) {
    [[659.25, 0], [880, 0.13], [1318.5, 0.26]].forEach(([freq, delay]) => {
      const t = t0 + delay;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.13, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      gain.connect(ctx.destination);
      [[1, 1], [2, 0.25]].forEach(([mult, level]) => {   // fundamental + soft overtone
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = level;
        osc.type = 'sine';
        osc.frequency.value = freq * mult;
        osc.connect(g).connect(gain);
        osc.start(t);
        osc.stop(t + 1.4);
      });
    });
  }

  // One bark: pitch drop through a vowel-like filter, plus a tiny noise "w" attack.
  function bark(ctx, t, pitch) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(140 * pitch, t + 0.2);

    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.Q.value = 2.5;
    formant.frequency.setValueAtTime(950, t);
    formant.frequency.exponentialRampToValueAtTime(520, t + 0.2);

    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 2200;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.55, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

    osc.connect(formant).connect(soften).connect(env).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);

    const len = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 1400;
    const ng = ctx.createGain();
    ng.gain.value = 0.18;
    noise.connect(nf).connect(ng).connect(ctx.destination);
    noise.start(t);
  }

  // "Woof woof"
  function woof(ctx, t0 = ctx.currentTime) {
    bark(ctx, t0, 1);
    bark(ctx, t0 + 0.32, 0.9);
  }

  return { chime, woof };
})();
