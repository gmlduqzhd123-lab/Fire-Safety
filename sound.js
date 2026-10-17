(function () {
  'use strict';

  window.FireEscape = window.FireEscape || {};

  // --- Web Audio API Synthesizer ---
  const SoundFX = {
    ctx: null,
    muted: false,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          try {
            this.ctx = new AudioCtx();
          } catch (e) {}
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    },
    playTone(freq, type, duration, vol = 0.12, slideTo = null) {
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slideTo) {
          osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
        }
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
      } catch (e) {}
    },
    playNoise(duration = 0.25, vol = 0.15) {
      if (this.muted || !this.ctx) return;
      try {
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 900;
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
      } catch (e) {}
    },
    pickup() {
      this.playTone(520, 'sine', 0.12, 0.14, 780);
      setTimeout(() => this.playTone(780, 'sine', 0.15, 0.14, 1040), 90);
    },
    water() {
      this.playTone(340, 'sine', 0.22, 0.15, 620);
      this.playNoise(0.2, 0.08);
    },
    spray() {
      this.playNoise(0.32, 0.22);
    },
    unlock() {
      this.playTone(440, 'triangle', 0.1, 0.15);
      setTimeout(() => this.playTone(660, 'triangle', 0.18, 0.15), 100);
    },
    bell() {
      this.playTone(880, 'square', 0.12, 0.14);
      setTimeout(() => this.playTone(987, 'square', 0.18, 0.14), 130);
    },
    hurt() {
      this.playTone(180, 'sawtooth', 0.22, 0.16, 95);
    },
    burnAlert() {
      this.playTone(620, 'sawtooth', 0.09, 0.12, 420);
    },
    warning() {
      this.playTone(300, 'square', 0.14, 0.12);
      setTimeout(() => this.playTone(240, 'square', 0.18, 0.12), 140);
    },
    win() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, idx) => {
        setTimeout(() => this.playTone(n, 'triangle', 0.22, 0.16), idx * 110);
      });
    },
    gameOver() {
      const notes = [392, 349.23, 329.63, 261.63];
      notes.forEach((n, idx) => {
        setTimeout(() => this.playTone(n, 'sawtooth', 0.28, 0.14), idx * 140);
      });
    },
    siren() {
      if (this.muted) return;
      this.playTone(580, 'sawtooth', 0.22, 0.1, 860);
      setTimeout(() => this.playTone(860, 'sawtooth', 0.25, 0.1, 580), 220);
    },
    speak(text, rate = 1.08, pitch = 1.0) {
      if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ko-KR';
        utter.rate = rate;
        utter.pitch = pitch;
        utter.volume = 0.85;
        window.speechSynthesis.speak(utter);
      } catch (e) {}
    }
  };

  window.FireEscape.SoundFX = SoundFX;
})();
