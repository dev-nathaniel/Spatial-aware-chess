/**
 * Procedural Web Audio synthesizer for wooden chess acoustics.
 * Produces authentic hand-rubbed wood-on-wood impact transients,
 * cavity resonances, captures, castling, and game-end chimes.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMove(pieceType = 'p') {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Pitch slightly lower for heavier pieces (Queen/King/Rook)
    const baseFreq =
      pieceType === 'k' || pieceType === 'q'
        ? 150
        : pieceType === 'r' || pieceType === 'b'
        ? 190
        : pieceType === 'n'
        ? 210
        : 235;
    const randomizedPitch = baseFreq * (0.95 + Math.random() * 0.1);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(randomizedPitch, t);
    osc.frequency.exponentialRampToValueAtTime(randomizedPitch * 0.4, t + 0.08);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(randomizedPitch * 2.2, t);
    osc2.frequency.exponentialRampToValueAtTime(randomizedPitch * 0.8, t + 0.06);

    // Wood impact bandpass filter
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(550 + Math.random() * 150, t);
    filter.Q.setValueAtTime(3.2, t);

    // Noise transient for the wooden click
    const bufferSize = this.ctx.sampleRate * 0.025;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    // Envelope
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    whiteNoise.connect(noiseGain);
    noiseGain.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc2.start(t);
    whiteNoise.start(t);
    osc.stop(t + 0.1);
    osc2.stop(t + 0.1);
    whiteNoise.stop(t + 0.03);
  }

  playCapture() {
    if (!this.enabled) return;
    this.playMove('r');
    // Double click slightly offset for piece displacement
    setTimeout(() => {
      this.playMove('p');
    }, 45);
  }

  playCastle() {
    if (!this.enabled) return;
    this.playMove('k');
    setTimeout(() => {
      this.playMove('r');
    }, 110);
  }

  playCheck() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.28);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  playGameEnd(isWin) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = isWin ? [330, 415, 493, 659] : [330, 311, 293, 277];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.5);
      }, idx * 120);
    });
  }
}

export const sound = new SoundEngine();
