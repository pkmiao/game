// audio.js — 全部音效用 WebAudio 实时合成，无需任何音频文件（保证离线可用）
window.HS = window.HS || {};

HS.audio = (function () {
  let ctx = null;
  let master = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }

  // 基础音：频率可滑动
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gn.gain.setValueAtTime(vol || 0.5, t0);
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(gn); gn.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  // 噪声：爆炸、挥击、滑铲
  function noise(dur, vol, filterFreq, type, delay) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const len = Math.max(1, (dur * ctx.sampleRate) | 0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type || 'lowpass';
    f.frequency.value = filterFreq || 800;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(vol || 0.5, t0);
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(gn); gn.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  return {
    init,
    laser()    { tone(950, 0.14, 'sawtooth', 0.35, 180); tone(1900, 0.08, 'square', 0.12, 400); },
        grenadeFire() { noise(0.12, 0.5, 500); tone(120, 0.15, 'sine', 0.5, 60); },
    explosion(){ noise(0.7, 0.9, 350); tone(110, 0.6, 'sine', 0.8, 35); },
    swing()    { noise(0.18, 0.35, 1200, 'bandpass'); },
    hit()      { tone(220, 0.08, 'square', 0.4, 140); },
    kill()     { tone(300, 0.1, 'square', 0.4, 500); tone(500, 0.12, 'square', 0.35, 750, 0.08); },
    hurt()     { tone(160, 0.25, 'sawtooth', 0.5, 90); },
    punch()    { noise(0.1, 0.6, 300); tone(90, 0.1, 'sine', 0.6, 50); },
    reload()   { tone(500, 0.05, 'square', 0.25); tone(700, 0.05, 'square', 0.25, null, 0.18); },
    jump()     { tone(300, 0.1, 'sine', 0.2, 480); },
    slide()    { noise(0.5, 0.25, 700); },
    poison()   { tone(180, 0.5, 'sine', 0.3, 90); noise(0.4, 0.2, 600); },
    shatter()  { noise(0.15, 0.45, 3500, 'highpass'); },
    step()     { noise(0.05, 0.08, 500); },
    uiClick()  { tone(600, 0.06, 'square', 0.25, 800); },
    win()      { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'square', 0.3, null, i * 0.14)); },
    lose()     { [400, 320, 240, 160].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.3, null, i * 0.2)); }
  };
})();
