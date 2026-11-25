// audio.js — Synthesized WebAudio sounds for Golden Wok.
// Everything is generated with oscillators and filtered noise: no audio files,
// no network, no assets. The engine starts on the first user gesture.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.sizzleNodes = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
    this.stopSizzle();
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  noiseBurst(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq || 2500;
    filter.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.25, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start(t0);
  }

  // Named game sounds.
  chop() { this.noiseBurst(0.09, 0.35, 1800); this.tone(180, 0.08, 'triangle', 0.25, 90); }
  pickup() { this.tone(520, 0.08, 'sine', 0.18, 700); }
  wokDrop() { this.noiseBurst(0.25, 0.2, 3200); this.tone(300, 0.12, 'sine', 0.12, 180); }
  ding() { this.tone(880, 0.35, 'sine', 0.22); this.tone(1318, 0.45, 'sine', 0.14); }
  serve() {
    this.tone(660, 0.12, 'triangle', 0.22);
    setTimeout(() => this.tone(880, 0.12, 'triangle', 0.22), 110);
    setTimeout(() => this.tone(1100, 0.22, 'triangle', 0.22), 220);
  }
  fail() { this.tone(220, 0.3, 'sawtooth', 0.14, 110); }
  burnt() { this.noiseBurst(0.3, 0.2, 700); this.tone(140, 0.35, 'square', 0.1, 70); }
  tick() { this.tone(1200, 0.04, 'square', 0.06); }
  dayClear() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.2), i * 130));
  }

  // Continuous wok sizzle while something cooks.
  startSizzle() {
    if (!this.ctx || this.muted || this.sizzleNodes) return;
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 3500;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start();
    this.sizzleNodes = { src, gain };
  }

  stopSizzle() {
    if (!this.sizzleNodes) return;
    try { this.sizzleNodes.src.stop(); } catch (e) { /* already stopped */ }
    this.sizzleNodes = null;
  }
}
