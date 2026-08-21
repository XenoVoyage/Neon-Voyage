(function attachNeonVoyageAudio(root) {
  "use strict";

  const ND = root.ND || (root.ND = {});
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class AudioEngine {
    constructor(options) {
      const config = options || {};
      this.context = null;
      this.master = null;
      this.noiseBuffer = null;
      this.muted = Boolean(config.muted);
      this.failed = false;
      this.activeNodes = 0;
      this.maxNodes = Math.min(24, Math.max(1, Math.floor(config.maxNodes || 24)));
      const configuredVolume = Number(config.volume);
      const defaultVolume = Number(ND.CONFIG && ND.CONFIG.audio && ND.CONFIG.audio.defaultVolume);
      this.volume = clamp(
        Number.isFinite(configuredVolume)
          ? configuredVolume
          : Number.isFinite(defaultVolume) ? defaultVolume : 0.8,
        0,
        1
      );
      this.lastCueAt = Object.create(null);
      this.nextAmbientAt = 0;
      this.ambientStep = 0;
    }

    unlock() {
      if (this.failed) return false;
      if (this.context) {
        this.resume();
        return true;
      }
      const Context = root.AudioContext || root.webkitAudioContext;
      if (!Context) {
        this.failed = true;
        return false;
      }
      try {
        const context = new Context();
        const master = context.createGain();
        master.gain.value = this.muted ? 0 : this.volume;
        master.connect(context.destination);
        this.context = context;
        this.master = master;
        this.noiseBuffer = this.createNoiseBuffer();
        this.resume();
        return true;
      } catch {
        this.context = null;
        this.master = null;
        this.noiseBuffer = null;
        this.failed = true;
        return false;
      }
    }

    ensure() {
      return this.unlock();
    }

    resume() {
      if (!this.context || this.context.state !== "suspended" || typeof this.context.resume !== "function") return;
      try {
        const result = this.context.resume();
        if (result && typeof result.catch === "function") result.catch(() => {});
      } catch {
        // Audio remains optional if the browser declines to resume it.
      }
    }

    createNoiseBuffer() {
      if (!this.context) return null;
      const frames = Math.max(1, Math.floor(this.context.sampleRate * 0.45));
      const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < frames; index += 1) {
        const envelope = 1 - index / frames;
        channel[index] = (Math.random() * 2 - 1) * envelope;
      }
      return buffer;
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      if (!this.context || !this.master) return;
      const now = this.context.currentTime;
      const target = this.muted ? 0 : this.volume;
      try {
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(target, now, 0.025);
      } catch {
        this.master.gain.value = target;
      }
    }

    setEnabled(enabled) {
      this.setMuted(!enabled);
    }

    setVolume(volume) {
      const next = Number(volume);
      if (!Number.isFinite(next)) return this.volume;
      this.volume = clamp(next, 0, 1);
      if (!this.context || !this.master) return this.volume;
      const now = this.context.currentTime;
      const target = this.muted ? 0 : this.volume;
      try {
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(target, now, 0.025);
      } catch {
        this.master.gain.value = target;
      }
      return this.volume;
    }

    canPlay() {
      return !this.muted && !this.failed && this.context && this.master && this.activeNodes < this.maxNodes;
    }

    allowCue(name, interval) {
      if (!this.context) return false;
      const key = String(name || "cue");
      const now = this.context.currentTime;
      const previous = Number(this.lastCueAt[key]);
      if (Number.isFinite(previous) && now - previous < Math.max(0, Number(interval) || 0)) return false;
      this.lastCueAt[key] = now;
      return true;
    }

    trackSource(source, nodes) {
      this.activeNodes += 1;
      let finished = false;
      const cleanup = () => {
        if (finished) return;
        finished = true;
        for (const node of nodes) {
          try { node.disconnect(); } catch { /* Already disconnected. */ }
        }
        this.activeNodes = Math.max(0, this.activeNodes - 1);
      };
      source.onended = cleanup;
      return cleanup;
    }

    tone(frequency, duration, type, volume, slide, delay) {
      if (!this.canPlay()) return false;
      const context = this.context;
      const length = clamp(Number(duration) || 0.08, 0.015, 1.4);
      const start = context.currentTime + clamp(Number(delay) || 0, 0, 1);
      let oscillator = null;
      let gain = null;
      let cleanup = null;
      try {
        oscillator = context.createOscillator();
        gain = context.createGain();
        oscillator.type = type || "sine";
        const startFrequency = Math.max(25, Number(frequency) || 220);
        const endFrequency = Math.max(25, startFrequency * Math.max(0.05, Number(slide) || 1));
        oscillator.frequency.setValueAtTime(startFrequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + length);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, Number(volume) || 0.04), start + Math.min(0.01, length * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
        oscillator.connect(gain);
        gain.connect(this.master);
        cleanup = this.trackSource(oscillator, [oscillator, gain]);
        oscillator.start(start);
        oscillator.stop(start + length + 0.02);
        return true;
      } catch {
        if (cleanup) cleanup();
        else {
          try { if (oscillator) oscillator.disconnect(); } catch { /* Optional audio. */ }
          try { if (gain) gain.disconnect(); } catch { /* Optional audio. */ }
        }
        return false;
      }
    }

    noise(duration, volume, filterFrequency, filterType) {
      if (!this.canPlay() || !this.noiseBuffer) return false;
      const context = this.context;
      const length = clamp(Number(duration) || 0.14, 0.02, 0.44);
      let source = null;
      let filter = null;
      let gain = null;
      let cleanup = null;
      try {
        source = context.createBufferSource();
        filter = context.createBiquadFilter();
        gain = context.createGain();
        source.buffer = this.noiseBuffer;
        filter.type = filterType || "lowpass";
        filter.frequency.value = clamp(Number(filterFrequency) || 700, 80, 10000);
        const now = context.currentTime;
        gain.gain.setValueAtTime(Math.max(0.0001, Number(volume) || 0.06), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        cleanup = this.trackSource(source, [source, filter, gain]);
        source.start(now);
        source.stop(now + length);
        return true;
      } catch {
        if (cleanup) cleanup();
        else {
          for (const node of [source, filter, gain]) {
            try { if (node) node.disconnect(); } catch { /* Optional audio. */ }
          }
        }
        return false;
      }
    }

    weapon(weapon) {
      if (!this.allowCue("player-weapon", 0.035)) return;
      if (weapon === "massDriver") {
        this.tone(920, 0.15, "sawtooth", 0.046, 0.16);
        this.tone(1840, 0.055, "square", 0.017, 0.46);
      } else if (weapon === "prism") {
        this.noise(0.075, 0.042, 2100, "highpass");
        this.tone(260, 0.1, "square", 0.034, 0.52);
      } else if (weapon === "seeker" || weapon === "homingSalvo") {
        this.tone(175, 0.18, "sine", 0.05, 2.45);
        this.noise(0.055, 0.018, 1650, "highpass");
      } else if (weapon === "radialArray") {
        this.tone(560, 0.085, "triangle", 0.035, 0.62);
        this.tone(840, 0.06, "sine", 0.018, 0.78, 0.025);
      } else if (weapon === "drone") {
        this.tone(520, 0.05, "triangle", 0.024, 0.66);
      } else if (weapon === "teslaCoil") {
        this.tone(690, 0.11, "sawtooth", 0.038, 1.65);
        this.tone(1380, 0.05, "square", 0.016, 0.72);
      } else if (weapon === "mineLayer") {
        this.tone(128, 0.12, "triangle", 0.038, 0.7);
        this.tone(310, 0.06, "sine", 0.018, 1.15, 0.045);
      } else if (weapon === "arcBurst") {
        this.noise(0.06, 0.026, 2600, "highpass");
        this.tone(640, 0.1, "sawtooth", 0.038, 1.72);
      } else if (weapon === "novaLance") {
        this.tone(1040, 0.22, "sawtooth", 0.05, 0.12);
        this.tone(2080, 0.07, "square", 0.018, 0.4);
      } else if (weapon === "pulse") {
        this.tone(430, 0.055, "square", 0.03, 0.44);
      } else {
        this.tone(430, 0.055, "square", 0.03, 0.44);
      }
    }

    impact(material, strength) {
      if (!this.allowCue("impact", 0.045)) return;
      const weight = clamp(Number(strength) || 0.5, 0.2, 1);
      if (material === "shield") {
        this.tone(620, 0.08, "sine", 0.03 + weight * 0.018, 0.54);
        this.tone(1180, 0.05, "triangle", 0.014 + weight * 0.009, 1.12);
      } else if (material === "asteroid") {
        this.noise(0.07 + weight * 0.045, 0.025 + weight * 0.028, 900, "lowpass");
        this.tone(126, 0.08, "sawtooth", 0.026 + weight * 0.015, 0.66);
      } else if (material === "alien") {
        this.tone(220, 0.075, "sawtooth", 0.028 + weight * 0.014, 0.56);
        this.tone(510, 0.045, "triangle", 0.012, 0.72);
      } else if (material === "boss") {
        this.tone(86, 0.12, "sawtooth", 0.04 + weight * 0.02, 0.72);
      } else if (material === "hull") {
        this.noise(0.1, 0.045 + weight * 0.035, 560, "lowpass");
        this.tone(94, 0.13, "square", 0.035, 0.52);
      } else {
        this.tone(150, 0.07, "sawtooth", 0.032, 0.68);
      }
    }

    destruction(kind, size) {
      const scale = Math.max(0, Number(size) || 0);
      const large = kind === "boss" || kind === "player" || scale > 70;
      if (!this.allowCue(large ? "destruction-large" : "destruction", large ? 0.12 : 0.065)) return;
      if (kind === "alien") {
        this.noise(large ? 0.28 : 0.16, large ? 0.09 : 0.055, large ? 420 : 820, "lowpass");
        this.tone(large ? 76 : 148, large ? 0.28 : 0.14, "sawtooth", large ? 0.07 : 0.04, 0.38);
        this.tone(large ? 330 : 470, 0.09, "triangle", 0.018, 1.34);
      } else {
        this.noise(large ? 0.36 : 0.18, large ? 0.115 : 0.066, kind === "asteroid" ? 430 : 650, "lowpass");
        this.tone(large ? 68 : kind === "mine" ? 104 : 118, large ? 0.34 : 0.17, "sawtooth", large ? 0.08 : 0.043, 0.4);
        if (kind === "boss" || kind === "player") this.tone(41, 0.5, "triangle", 0.05, 0.66, 0.06);
      }
    }

    pickup(kind) {
      if (!this.allowCue("pickup", 0.08)) return;
      const base = kind === "repair" ? 620 : kind === "shield" || kind === "aegis" ? 520 : kind === "enigma" ? 440 : kind === "module" ? 700 : 560;
      this.tone(base, 0.08, "sine", 0.048, 1.48);
      this.tone(base * 1.52, 0.13, "triangle", 0.033, 1.24, 0.055);
    }

    upgrade() {
      if (!this.allowCue("upgrade", 0.12)) return;
      this.tone(290, 0.07, "triangle", 0.035, 1.8);
      this.tone(620, 0.06, "sine", 0.025, 1.12, 0.045);
    }

    dash() {
      if (!this.allowCue("dash", 0.08)) return;
      this.noise(0.1, 0.05, 1450, "highpass");
      this.tone(155, 0.14, "sawtooth", 0.045, 2.3);
    }

    pulse() {
      if (!this.allowCue("pulse", 0.3)) return;
      this.tone(102, 0.62, "sine", 0.105, 4.4);
      this.tone(205, 0.4, "triangle", 0.06, 2.15, 0.055);
    }

    playerDamage(material) {
      if (!this.allowCue("player-damage", 0.16)) return;
      if (material === "shield") {
        this.tone(480, 0.18, "sine", 0.065, 0.42);
        this.tone(920, 0.08, "triangle", 0.026, 0.74);
      } else {
        this.noise(0.22, 0.105, 460, "lowpass");
        this.tone(74, 0.29, "square", 0.062, 0.5);
      }
    }

    enemyWeapon(source) {
      if (!this.allowCue("enemy-weapon", 0.065)) return;
      if (source === "harrower" || source === "leviathan") {
        this.tone(source === "leviathan" ? 118 : 142, 0.18, "sawtooth", 0.044, 0.4);
        this.tone(360, 0.07, "triangle", 0.018, 0.72);
      } else if (source === "bomber" || source === "carrier" || source === "broodCarrier") {
        this.tone(185, 0.15, "sawtooth", 0.034, 0.42);
        this.noise(0.065, 0.018, 1400, "highpass");
      } else if (source === "lancer" || source === "gunship") {
        this.tone(390, 0.11, "square", 0.031, 0.48);
      } else {
        this.tone(245, 0.13, "sawtooth", 0.028, 0.46);
      }
    }

    bossWeapon(kind) {
      if (!this.allowCue("boss-weapon", 0.18)) return;
      if (kind === "beam") {
        this.noise(0.28, 0.09, 520, "lowpass");
        this.tone(58, 0.42, "sawtooth", 0.082, 2.2);
      }
    }

    bossCue() {
      if (!this.allowCue("boss-cue", 0.5)) return;
      this.noise(0.32, 0.085, 310);
      this.tone(55, 0.65, "sawtooth", 0.085, 0.78);
      this.tone(82.4, 0.52, "triangle", 0.05, 0.9, 0.12);
    }

    arena() {
      if (!this.allowCue("arena", 0.5)) return;
      this.tone(92, 0.48, "sine", 0.07, 2.4);
      this.tone(184, 0.28, "square", 0.026, 0.72, 0.08);
    }

    ambientPulse(time, intensity) {
      if (!this.canPlay()) return;
      const clock = Number.isFinite(time) ? time : this.context.currentTime;
      if (clock < this.nextAmbientAt) return;
      const strength = clamp(Number(intensity) || 0.5, 0, 1);
      const pattern = [55, 55, 73.42, 82.41, 55, 110, 65.41, 82.41];
      const frequency = pattern[this.ambientStep % pattern.length];
      this.tone(frequency, 0.24, "triangle", 0.009 + strength * 0.012, 0.99);
      if (this.ambientStep % 2 === 0) this.tone(frequency * 2, 0.07, "square", 0.004 + strength * 0.005, 0.82);
      this.ambientStep += 1;
      this.nextAmbientAt = clock + 0.34 - strength * 0.07;
    }

    musicTick(time, intensity) {
      this.ambientPulse(time, intensity);
    }

    resetTimeline() {
      this.nextAmbientAt = 0;
      this.ambientStep = 0;
      this.lastCueAt = Object.create(null);
    }

  }

  ND.AudioEngine = AudioEngine;
})(typeof window === "object" ? window : globalThis);
