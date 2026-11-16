// VOID BLOOM — all sound is synthesised with WebAudio oscillators and noise.
// There are no audio files: each effect is a tiny recipe of pitch, decay and
// wave shape, played through one master gain. The context is created lazily on
// the first user gesture, as browsers require.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.32;
    master.connect(ctx.destination);
    return true;
  }

  /** One oscillator blip with an exponential decay envelope. */
  function blip(freqFrom, freqTo, seconds, type, volume) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), t + seconds);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  /** A short burst of filtered noise, for explosions and impacts. */
  function noiseBurst(seconds, volume, cutoff) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    source.connect(filter).connect(gain).connect(master);
    source.start(t);
  }

  return {
    unlock: ensure,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.32;
      return muted;
    },
    shoot() {
      blip(880, 320, 0.07, 'square', 0.1);
    },
    hit() {
      blip(300, 180, 0.05, 'triangle', 0.12);
    },
    explode(big) {
      noiseBurst(big ? 0.4 : 0.2, big ? 0.5 : 0.3, big ? 900 : 1400);
      blip(big ? 160 : 220, 40, big ? 0.35 : 0.2, 'sine', 0.4);
    },
    hurt() {
      blip(140, 60, 0.25, 'sawtooth', 0.35);
      noiseBurst(0.15, 0.2, 700);
    },
    dash() {
      noiseBurst(0.12, 0.15, 2400);
    },
    waveClear() {
      blip(520, 520, 0.1, 'triangle', 0.2);
      setTimeout(() => blip(660, 660, 0.1, 'triangle', 0.2), 90);
      setTimeout(() => blip(880, 880, 0.16, 'triangle', 0.22), 180);
    },
    upgrade() {
      blip(440, 880, 0.18, 'triangle', 0.25);
    },
    gameOver() {
      blip(392, 392, 0.2, 'triangle', 0.25);
      setTimeout(() => blip(311, 311, 0.2, 'triangle', 0.25), 200);
      setTimeout(() => blip(233, 110, 0.5, 'triangle', 0.28), 400);
    },
  };
}
