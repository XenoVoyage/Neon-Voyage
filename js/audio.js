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
      this.volume = clamp(Number(config.volume) || 0.32, 0, 1);
      this.lastShotAt = -Infinity;
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

    canPlay() {
      return !this.muted && !this.failed && this.context && this.master && this.activeNodes < this.maxNodes;
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

    shoot(weapon) {
      if (!this.context || this.context.currentTime - this.lastShotAt < 0.035) return;
      this.lastShotAt = this.context.currentTime;
      if (weapon === "scatter") {
        this.noise(0.075, 0.045, 1800, "highpass");
        this.tone(230, 0.09, "square", 0.035, 0.55);
      } else if (weapon === "rail") {
        this.tone(880, 0.14, "sawtooth", 0.045, 0.18);
        this.tone(1760, 0.06, "square", 0.018, 0.5);
      } else if (weapon === "plasma") {
        this.tone(180, 0.2, "sine", 0.055, 2.8);
      } else {
        this.tone(430, 0.055, "square", 0.03, 0.44);
      }
    }

    hit() {
      this.tone(132, 0.065, "sawtooth", 0.035, 0.68);
    }

    explode(large) {
      const isLarge = large === true || Number(large) > 0.65;
      this.noise(isLarge ? 0.34 : 0.17, isLarge ? 0.11 : 0.065, isLarge ? 360 : 760);
      this.tone(isLarge ? 72 : 118, isLarge ? 0.3 : 0.15, "sawtooth", isLarge ? 0.075 : 0.042, 0.42);
    }

    pickup() {
      this.tone(510, 0.08, "sine", 0.05, 1.5);
      this.tone(780, 0.13, "triangle", 0.035, 1.28, 0.055);
    }

    weaponSwitch() {
      this.tone(290, 0.07, "triangle", 0.035, 1.8);
      this.tone(620, 0.06, "sine", 0.025, 1.12, 0.045);
    }

    dash() {
      this.noise(0.1, 0.05, 1450, "highpass");
      this.tone(155, 0.14, "sawtooth", 0.045, 2.3);
    }

    pulse() {
      this.tone(102, 0.62, "sine", 0.105, 4.4);
      this.tone(205, 0.4, "triangle", 0.06, 2.15, 0.055);
    }

    damage() {
      this.noise(0.2, 0.1, 480);
      this.tone(76, 0.28, "square", 0.06, 0.52);
    }

    alienShot() {
      this.tone(245, 0.13, "sawtooth", 0.028, 0.46);
    }

    bossCue() {
      this.noise(0.32, 0.085, 310);
      this.tone(55, 0.65, "sawtooth", 0.085, 0.78);
      this.tone(82.4, 0.52, "triangle", 0.05, 0.9, 0.12);
    }

    arena() {
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
      this.lastShotAt = -Infinity;
    }

  }

  ND.AudioEngine = AudioEngine;
})(typeof window === "object" ? window : globalThis);
