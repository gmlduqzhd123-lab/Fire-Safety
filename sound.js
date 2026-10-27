(function () {
  'use strict';

  window.FireEscape = window.FireEscape || {};

  // --- Web Audio API Synthesizer, 3D Spatial Audio, Vital Heartbeat, Radio TTS Coach & BGM Player ---
  const SoundFX = {
    ctx: null,
    muted: false,
    voiceCoachEnabled: true,
    bgmAudio: null,
    bgmEnabled: true,
    bgmVolume: 0.35,
    spatialCrackleTimer: 0,
    lastSpatialPan: 0,
    lastSpatialGain: 0,
    vitalBeatTimer: 0,
    lastRadioTimestamp: 0,
    loadBgmPrefs() {
      try {
        const savedEnabled = localStorage.getItem('fire_escape_bgm_enabled');
        if (savedEnabled === 'false') {
          this.bgmEnabled = false;
        } else if (savedEnabled === 'true') {
          this.bgmEnabled = true;
        }
        const savedVol = localStorage.getItem('fire_escape_bgm_volume');
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (Number.isFinite(parsed)) {
            this.bgmVolume = Math.max(0, Math.min(1, parsed));
          }
        }
      } catch (e) {}
    },
    initBgm() {
      if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
      if (!this.bgmAudio) {
        try {
          const audio = new Audio('./bgm.mp3');
          audio.loop = true;
          audio.preload = 'auto';
          audio.volume = this.bgmEnabled ? Math.max(0, Math.min(1, this.bgmVolume)) : 0;
          this.bgmAudio = audio;
        } catch (e) {}
      }
      return this.bgmAudio;
    },
    playBgm() {
      const audio = this.initBgm();
      if (!audio) return;
      audio.volume = this.bgmEnabled ? Math.max(0, Math.min(1, this.bgmVolume)) : 0;
      if (this.bgmEnabled && this.bgmVolume > 0 && audio.paused) {
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
    },
    pauseBgm() {
      if (this.bgmAudio && !this.bgmAudio.paused) {
        try {
          this.bgmAudio.pause();
        } catch (e) {}
      }
    },
    setBgmEnabled(enabled) {
      this.bgmEnabled = !!enabled;
      if (this.bgmEnabled && this.bgmVolume <= 0) {
        this.bgmVolume = 0.35;
        try {
          localStorage.setItem('fire_escape_bgm_volume', String(this.bgmVolume));
        } catch (e) {}
      }
      try {
        localStorage.setItem('fire_escape_bgm_enabled', this.bgmEnabled ? 'true' : 'false');
      } catch (e) {}
      if (this.bgmEnabled && this.bgmVolume > 0) {
        this.playBgm();
      } else {
        this.pauseBgm();
      }
      return this.bgmEnabled;
    },
    toggleBgm() {
      return this.setBgmEnabled(!this.bgmEnabled);
    },
    setBgmVolume(vol0to1) {
      const parsed = Number(vol0to1);
      const clamped = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.35;
      this.bgmVolume = Number(clamped.toFixed(2));
      try {
        localStorage.setItem('fire_escape_bgm_volume', String(this.bgmVolume));
      } catch (e) {}
      const audio = this.initBgm();
      if (audio) {
        audio.volume = this.bgmEnabled ? this.bgmVolume : 0;
      }
      if (this.bgmVolume <= 0) {
        this.pauseBgm();
      } else if (this.bgmEnabled) {
        this.playBgm();
      }
      return this.bgmVolume;
    },
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
      if (this.bgmEnabled && this.bgmVolume > 0) {
        this.playBgm();
      }
    },
    // Idea #5 (Prev): 3D Spatial Audio & Crouch Low-Pass Filter for Nearby Fires
    updateSpatialFireAudio(listenerX, listenerY, listenerYaw, fires, isCrouching, dt = 0.016) {
      if (this.muted || !Array.isArray(fires) || fires.length === 0) {
        this.lastSpatialGain = 0;
        return;
      }
      let nearest = null;
      let minDist = Infinity;
      for (let i = 0; i < fires.length; i++) {
        const f = fires[i];
        const d = Math.hypot((f.c + 0.5) - listenerX, (f.r + 0.5) - listenerY);
        if (d < minDist) {
          minDist = d;
          nearest = f;
        }
      }
      if (!nearest || minDist > 7.5) {
        this.lastSpatialGain = 0;
        return;
      }
      const dx = (nearest.c + 0.5) - listenerX;
      const dy = (nearest.r + 0.5) - listenerY;
      const angleToFire = Math.atan2(dy, dx);
      const relAngle = angleToFire - (Number.isFinite(listenerYaw) ? listenerYaw : 0);
      const pan = Math.max(-0.95, Math.min(0.95, Math.sin(relAngle)));
      const proximity = Math.max(0, 1 - minDist / 7.5);
      const vol = proximity * proximity * (isCrouching ? 0.07 : 0.13);

      this.lastSpatialPan = pan;
      this.lastSpatialGain = vol;

      this.spatialCrackleTimer -= dt;
      if (this.spatialCrackleTimer <= 0 && this.ctx) {
        this.spatialCrackleTimer = 0.14 + Math.random() * 0.14;
        try {
          const dur = 0.09 + Math.random() * 0.07;
          const bufferSize = Math.floor(this.ctx.sampleRate * dur);
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.25 ? 1 : 0.2);
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = isCrouching ? 'lowpass' : 'bandpass';
          filter.frequency.value = isCrouching ? 380 : (720 + Math.random() * 480);

          const gain = this.ctx.createGain();
          const now = this.ctx.currentTime;
          gain.gain.setValueAtTime(Math.max(0.005, vol), now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          noise.connect(filter);
          if (typeof this.ctx.createStereoPanner === 'function') {
            const panner = this.ctx.createStereoPanner();
            panner.pan.setValueAtTime(pan, now);
            filter.connect(panner);
            panner.connect(gain);
          } else {
            filter.connect(gain);
          }
          gain.connect(this.ctx.destination);
          noise.start(now);
        } catch (e) {}
      }
    },
    stopSpatialAudio() {
      this.lastSpatialGain = 0;
      this.lastSpatialPan = 0;
    },
    // New Idea #9: Dynamic Vital Heartbeat Synthesizer (Scales BPM with Low O2 / HP)
    updateVitalsHeartbeat(hp, o2, dt = 0.016) {
      if (this.muted) return;
      const minVital = Math.min(Number(hp) || 100, Number(o2) || 100);
      if (minVital > 42) {
        this.vitalBeatTimer = 0;
        return;
      }
      // Scale interval from 0.85s (70 BPM at 42%) down to 0.42s (142 BPM at 5%)
      const urgency = Math.max(0, Math.min(1, (42 - minVital) / 37));
      const interval = 0.85 - urgency * 0.43;
      this.vitalBeatTimer -= dt;
      if (this.vitalBeatTimer <= 0) {
        this.vitalBeatTimer = interval;
        this.heartbeat(0.16 + urgency * 0.12);
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
    // New Idea #3: Ceiling Sprinkler Activation Sound
    sprinklerSpray() {
      if (this.muted) return;
      this.playNoise(0.18, 0.09);
      this.playTone(680, 'sine', 0.09, 0.06, 920);
    },
    // New Idea #5: 119 Emergency Situation Room Dispatcher Tone
    dispatcher119Beep() {
      if (this.muted) return;
      this.playTone(960, 'sine', 0.08, 0.12);
      setTimeout(() => this.playTone(1240, 'sine', 0.11, 0.12), 95);
    },
    // New Idea #6: Rhythmic CPR Chest Compression & First-Aid Beep
    cprPulse(step = 1) {
      if (this.muted) return;
      const pitch = 540 + step * 90;
      this.playTone(pitch, 'triangle', 0.10, 0.15, pitch * 1.15);
    },
    foamPulse(progress = 0.5) {
      this.playNoise(0.14, 0.18);
      this.playTone(320 + progress * 260, 'sine', 0.10, 0.09, 480 + progress * 300);
    },
    doorSwing(isOpen = true) {
      if (this.muted) return;
      if (isOpen) {
        this.playTone(210, 'triangle', 0.16, 0.14, 340);
      } else {
        this.playTone(155, 'triangle', 0.12, 0.18, 62);
        this.playNoise(0.08, 0.12);
      }
    },
    debrisBreak() {
      if (this.muted) return;
      this.playNoise(0.26, 0.24);
      this.playTone(190, 'sawtooth', 0.18, 0.16, 75);
      setTimeout(() => this.playTone(140, 'triangle', 0.14, 0.14, 58), 90);
    },
    lifelineDescent() {
      if (this.muted) return;
      this.playTone(480, 'sine', 0.45, 0.13, 210);
      setTimeout(() => this.playTone(523.25, 'triangle', 0.25, 0.15, 783.99), 380);
    },
    unlock() {
      this.playTone(440, 'triangle', 0.1, 0.15);
      setTimeout(() => this.playTone(660, 'triangle', 0.18, 0.15), 100);
    },
    comboChime(comboCount = 1) {
      if (this.muted) return;
      const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const baseFreq = scale[Math.min(scale.length - 1, Math.max(0, comboCount - 1))];
      this.playTone(baseFreq, 'triangle', 0.12, 0.14, baseFreq * 1.25);
      setTimeout(() => this.playTone(baseFreq * 1.25, 'sine', 0.16, 0.13, baseFreq * 1.5), 75);
    },
    lessonBell() {
      if (this.muted) return;
      this.playTone(659.25, 'sine', 0.22, 0.15);
      setTimeout(() => this.playTone(523.25, 'sine', 0.28, 0.15), 200);
      setTimeout(() => this.playTone(783.99, 'triangle', 0.35, 0.16), 420);
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
    coughWarning() {
      if (this.muted) return;
      this.playNoise(0.11, 0.16);
      this.playTone(230, 'sawtooth', 0.12, 0.11, 145);
      setTimeout(() => {
        this.playNoise(0.13, 0.15);
        this.playTone(210, 'sawtooth', 0.14, 0.10, 125);
      }, 150);
    },
    heartbeat(vol = 0.22) {
      if (this.muted) return;
      this.playTone(62, 'sine', 0.11, vol, 42);
      setTimeout(() => this.playTone(54, 'sine', 0.14, vol * 0.82, 36), 165);
    },
    guidePing() {
      if (this.muted) return;
      this.playTone(980, 'sine', 0.09, 0.08, 1320);
    },
    doorShut() {
      if (this.muted) return;
      this.playTone(155, 'triangle', 0.12, 0.18, 62);
      this.playNoise(0.08, 0.12);
    },
    oilExplosion() {
      if (this.muted) return;
      this.playNoise(0.38, 0.26);
      this.playTone(140, 'sawtooth', 0.28, 0.18, 52);
    },
    // New Idea #10: Firefighter Walkie-Talkie Radio Squelch + TTS Voice Coaching
    radioSquelch() {
      if (this.muted) return;
      this.playNoise(0.06, 0.10);
      this.playTone(1480, 'sine', 0.045, 0.06, 1120);
    },
    // Strategy #1: FLIR Thermal Vision Activation Sound
    thermalVisionToggle(active = true) {
      if (this.muted) return;
      if (active) {
        this.playTone(620, 'sine', 0.09, 0.11, 1280);
        setTimeout(() => this.playTone(1360, 'triangle', 0.12, 0.09, 1680), 80);
      } else {
        this.playTone(980, 'sine', 0.10, 0.10, 440);
      }
    },
    // Strategy #4: PASS Extinguisher Perfect Sweep Fanfare
    sweepPerfect() {
      if (this.muted) return;
      this.playNoise(0.18, 0.16);
      this.playTone(587.33, 'triangle', 0.10, 0.14, 880);
      setTimeout(() => this.playTone(880, 'triangle', 0.14, 0.15, 1174.66), 85);
    },
    // Strategy #6: Earthquake Seismic Tremor Rumble
    earthquakeRumble() {
      if (this.muted) return;
      this.playNoise(0.35, 0.20);
      this.playTone(72, 'sawtooth', 0.32, 0.18, 44);
    },
    // Strategy #7: Fire Shutter Green Sub-Door Push Sound
    shutterDoorPush() {
      if (this.muted) return;
      this.playTone(280, 'triangle', 0.12, 0.14, 520);
      setTimeout(() => this.playTone(660, 'sine', 0.14, 0.13, 880), 95);
    },
    // Strategy #3: Stereo-Panned Tone Helper & 3D Acoustic Exit/SOS Navigation
    exitBeaconTimer: 0,
    sosBeaconTimer: 0,
    lastAcousticCue: '',
    lastAcousticPan: 0,
    playSpatialTone(freq, type, duration, vol = 0.09, pan = 0, slideTo = null) {
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
        gain.gain.setValueAtTime(Math.max(0.002, vol), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        if (typeof this.ctx.createStereoPanner === 'function') {
          const panner = this.ctx.createStereoPanner();
          panner.pan.setValueAtTime(Math.max(-0.95, Math.min(0.95, pan)), now);
          osc.connect(panner);
          panner.connect(gain);
        } else {
          osc.connect(gain);
        }
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
      } catch (e) {}
    },
    updateSpatialNavigationAudio(listenerX, listenerY, listenerYaw, grid, TILE, items, smokes, dt = 0.016) {
      if (this.muted || !grid || !TILE) {
        this.lastAcousticCue = '';
        return;
      }
      const yaw = Number.isFinite(listenerYaw) ? listenerYaw : 0;

      // 1. Find nearest EXIT tile for acoustic exit sign chime
      let bestExit = null;
      let minExitDist = Infinity;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] === TILE.EXIT) {
            const d = Math.hypot((c + 0.5) - listenerX, (r + 0.5) - listenerY);
            if (d < minExitDist) {
              minExitDist = d;
              bestExit = { c, r, d };
            }
          }
        }
      }

      // 2. Find nearest unrescued survivor/pet (npc/dog)
      let bestNpc = null;
      let minNpcDist = Infinity;
      if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (it.type === 'npc' || it.type === 'dog') {
            const d = Math.hypot((it.c + 0.5) - listenerX, (it.r + 0.5) - listenerY);
            if (d < minNpcDist) {
              minNpcDist = d;
              bestNpc = { c: it.c, r: it.r, d, name: it.name || '요구조자' };
            }
          }
        }
      }

      if (bestExit && minExitDist <= 11.5) {
        const ang = Math.atan2((bestExit.r + 0.5) - listenerY, (bestExit.c + 0.5) - listenerX) - yaw;
        const pan = Math.max(-0.95, Math.min(0.95, Math.sin(ang)));
        const dirLabel = pan < -0.25 ? '◀좌측' : (pan > 0.25 ? '▶우측' : '▲정면');
        this.lastAcousticPan = pan;
        this.lastAcousticCue = `🔊 비상구 유도음(${dirLabel} ${minExitDist.toFixed(1)}m)`;

        this.exitBeaconTimer -= dt;
        if (this.exitBeaconTimer <= 0) {
          this.exitBeaconTimer = Math.max(1.3, Math.min(2.8, minExitDist * 0.24));
          const prox = Math.max(0.15, 1 - minExitDist / 12);
          this.playSpatialTone(880, 'sine', 0.08, 0.045 * prox, pan, 1174.66);
        }
      } else {
        this.lastAcousticCue = '';
      }

      if (bestNpc && minNpcDist <= 6.2) {
        const ang = Math.atan2((bestNpc.r + 0.5) - listenerY, (bestNpc.c + 0.5) - listenerX) - yaw;
        const pan = Math.max(-0.95, Math.min(0.95, Math.sin(ang)));
        const dirLabel = pan < -0.25 ? '◀좌측' : (pan > 0.25 ? '▶우측' : '▲정면');
        this.lastAcousticCue = `🆘 ${bestNpc.name} 구조신호(${dirLabel} ${minNpcDist.toFixed(1)}m)`;
        this.sosBeaconTimer -= dt;
        if (this.sosBeaconTimer <= 0) {
          this.sosBeaconTimer = 2.6;
          const prox = Math.max(0.2, 1 - minNpcDist / 6.5);
          this.playSpatialTone(659.25, 'triangle', 0.09, 0.055 * prox, pan, 783.99);
        }
      }
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
    },
    speakRadioCoaching(text, force = false) {
      if (this.muted || !this.voiceCoachEnabled || !text) return;
      const nowMs = Date.now();
      if (!force && nowMs - this.lastRadioTimestamp < 2800) return;
      this.lastRadioTimestamp = nowMs;
      this.radioSquelch();
      this.speak(text, 1.10, 0.96);
    }
  };

  SoundFX.loadBgmPrefs();
  if (typeof window !== 'undefined') {
    const tryUnlockBgm = () => {
      if (SoundFX.bgmEnabled && SoundFX.bgmVolume > 0) {
        SoundFX.playBgm();
      }
    };
    window.addEventListener('pointerdown', tryUnlockBgm, { passive: true });
    window.addEventListener('keydown', tryUnlockBgm, { passive: true });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          SoundFX.pauseBgm();
        } else if (SoundFX.bgmEnabled && SoundFX.bgmVolume > 0) {
          SoundFX.playBgm();
        }
      });
    }
  }

  window.FireEscape.SoundFX = SoundFX;
})();
