
/**
 * Procedural Web Audio Engine for Motorcycle Racing.
 * Bullet 350-inspired deep single-cylinder thump.
 * Keeps existing sound-controller methods and exports.
 */

import { SoundProfile } from '../game/motorcycles';

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private masterGain: GainNode | null = null;

  private engineMasterGain: GainNode | null = null;
  private windMasterGain: GainNode | null = null;
  private fxMasterGain: GainNode | null = null;

  public volumeSettings = {
    master: 0.85,
    engine: 0.9,
    traffic: 0.75,
    wind: 0.6,
  };

  private idleBufferSource: AudioBufferSourceNode | null = null;
  private accelBufferSource: AudioBufferSourceNode | null = null;
  private coastBufferSource: AudioBufferSourceNode | null = null;

  private idleGain: GainNode | null = null;
  private accelGain: GainNode | null = null;
  private coastGain: GainNode | null = null;

  private subBassOsc: OscillatorNode | null = null;
  private subBassGain: GainNode | null = null;

  private gearWhineOsc: OscillatorNode | null = null;
  private gearWhineGain: GainNode | null = null;

  private engineFilter: BiquadFilterNode | null = null;

  private lastThrottleState = false;
  private overrunTimer = 0;

  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windNoiseNode: AudioBufferSourceNode | null = null;

  private brakeGain: GainNode | null = null;
  private brakeOsc: OscillatorNode | null = null;

  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;

  private currentProfile: SoundProfile = {
    id: 'bullet-350-sound',
    name: 'Bullet 350 Deep Thump',
    idlePulseFreq: 9,
    maxPulseFreq: 44,
    subBassFreq: 34,
    subBassDepth: 0.95,
    filterIdle: 280,
    filterMax: 1650,
    mechanicalClatter: 0.35,
    gearWhine: 0.08,
    overrunPop: 0.25,
    exhaustTone: 'deep-bullet-thump',
    exhaustDescription:
      'Procedural low-frequency single-cylinder thump with exhaust resonance.',
    disclaimer:
      'Synthesized Bullet 350-inspired audio; not an original motorcycle recording.',
  };

  private isRunning = false;

  constructor() {}

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted
        ? 0
        : this.volumeSettings.master;
      this.masterGain.connect(this.ctx.destination);

      this.engineMasterGain = this.ctx.createGain();
      this.engineMasterGain.gain.value = this.volumeSettings.engine;
      this.engineMasterGain.connect(this.masterGain);

      this.windMasterGain = this.ctx.createGain();
      this.windMasterGain.gain.value = this.volumeSettings.wind;
      this.windMasterGain.connect(this.masterGain);

      this.fxMasterGain = this.ctx.createGain();
      this.fxMasterGain.gain.value = this.volumeSettings.traffic;
      this.fxMasterGain.connect(this.masterGain);

      this.buildEngineAcousticLayers();
      this.setupWind();
      this.setupBrake();
      this.setupHorn();

      this.isRunning = true;
    } catch {
      // Audio may be unavailable in the current browser.
    }
  }

  private buildEngineAcousticLayers() {
    if (!this.ctx || !this.engineMasterGain) return;

    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const duration = 2;
    const totalSamples = Math.floor(sampleRate * duration);

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = this.currentProfile.filterIdle;
    this.engineFilter.Q.value = 1.2;

    // Profile-controlled combustion cadence.
    const idlePulsePeriod =
      sampleRate /
      Math.max(1, this.currentProfile.idlePulseFreq);

    const idleBuffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const idleData = idleBuffer.getChannelData(0);

    for (let i = 0; i < totalSamples; i++) {
      const pos = (i % idlePulsePeriod) / sampleRate;
      let sample = 0;

      if (pos < 0.095) {
        const decay = Math.exp(-pos * 48);

        const thump =
          Math.sin(2 * Math.PI * 62 * pos) * 0.55 +
          Math.sin(2 * Math.PI * 110 * pos) * 0.35 +
          Math.sin(2 * Math.PI * 165 * pos) * 0.16 +
          Math.sin(2 * Math.PI * 220 * pos) * 0.08;

        const softAttack =
          pos < 0.003
            ? (Math.random() * 2 - 1) * 0.12
            : 0;

        sample = (thump + softAttack) * decay;
      }

      idleData[i] = sample;
    }

    const accelBuffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const accelData = accelBuffer.getChannelData(0);

    for (let i = 0; i < totalSamples; i++) {
      const pos = (i % idlePulsePeriod) / sampleRate;
      let sample = 0;

      if (pos < 0.105) {
        const decay = Math.exp(-pos * 34);

        const bark =
          Math.sin(2 * Math.PI * 75 * pos) * 0.48 +
          Math.sin(2 * Math.PI * 135 * pos) * 0.38 +
          Math.sin(2 * Math.PI * 270 * pos) * 0.17 +
          (Math.random() * 2 - 1) * 0.07;

        sample = bark * decay;
      }

      accelData[i] = sample;
    }

    const coastBuffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const coastData = coastBuffer.getChannelData(0);

    for (let i = 0; i < totalSamples; i++) {
      const pos = (i % idlePulsePeriod) / sampleRate;
      let sample = 0;

      if (pos < 0.085) {
        const decay = Math.exp(-pos * 58);

        sample =
          (
            Math.sin(2 * Math.PI * 55 * pos) * 0.55 +
            Math.sin(2 * Math.PI * 110 * pos) * 0.22
          ) * decay * 0.62;
      }

      coastData[i] = sample;
    }

    this.idleBufferSource = ctx.createBufferSource();
    this.idleBufferSource.buffer = idleBuffer;
    this.idleBufferSource.loop = true;

    this.accelBufferSource = ctx.createBufferSource();
    this.accelBufferSource.buffer = accelBuffer;
    this.accelBufferSource.loop = true;

    this.coastBufferSource = ctx.createBufferSource();
    this.coastBufferSource.buffer = coastBuffer;
    this.coastBufferSource.loop = true;

    this.idleGain = ctx.createGain();
    this.idleGain.gain.value = 0.5;

    this.accelGain = ctx.createGain();
    this.accelGain.gain.value = 0;

    this.coastGain = ctx.createGain();
    this.coastGain.gain.value = 0;

    this.idleBufferSource.connect(this.idleGain);
    this.accelBufferSource.connect(this.accelGain);
    this.coastBufferSource.connect(this.coastGain);

    this.idleGain.connect(this.engineFilter);
    this.accelGain.connect(this.engineFilter);
    this.coastGain.connect(this.engineFilter);

    // Deep low-frequency layer.
    this.subBassOsc = ctx.createOscillator();
    this.subBassOsc.type = 'sine';
    this.subBassOsc.frequency.value = this.currentProfile.subBassFreq;

    this.subBassGain = ctx.createGain();
    this.subBassGain.gain.value = 0.3;

    this.subBassOsc.connect(this.subBassGain);
    this.subBassGain.connect(this.engineFilter);

    this.gearWhineOsc = ctx.createOscillator();
    this.gearWhineOsc.type = 'triangle';
    this.gearWhineOsc.frequency.value = 220;

    this.gearWhineGain = ctx.createGain();
    this.gearWhineGain.gain.value = 0;

    this.gearWhineOsc.connect(this.gearWhineGain);
    this.gearWhineGain.connect(this.engineFilter);

    this.engineFilter.connect(this.engineMasterGain);

    this.idleBufferSource.start();
    this.accelBufferSource.start();
    this.coastBufferSource.start();
    this.subBassOsc.start();
    this.gearWhineOsc.start();
  }

  private setupWind() {
    if (!this.ctx || !this.windMasterGain) return;

    const size = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;

    for (let i = 0; i < size; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.12;
    }

    this.windNoiseNode = this.ctx.createBufferSource();
    this.windNoiseNode.buffer = buffer;
    this.windNoiseNode.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 380;
    this.windFilter.Q.value = 1.1;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;

    this.windNoiseNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.windMasterGain);

    this.windNoiseNode.start();
  }

  private setupBrake() {
    if (!this.ctx || !this.fxMasterGain) return;

    this.brakeOsc = this.ctx.createOscillator();
    this.brakeOsc.type = 'sine';
    this.brakeOsc.frequency.value = 2600;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 9;

    this.brakeGain = this.ctx.createGain();
    this.brakeGain.gain.value = 0;

    this.brakeOsc.connect(filter);
    filter.connect(this.brakeGain);
    this.brakeGain.connect(this.fxMasterGain);

    this.brakeOsc.start();
  }

  private setupHorn() {
    if (!this.ctx || !this.fxMasterGain) return;

    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc1.type = 'sawtooth';
    this.hornOsc1.frequency.value = 440;

    this.hornOsc2 = this.ctx.createOscillator();
    this.hornOsc2.type = 'triangle';
    this.hornOsc2.frequency.value = 554.37;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1700;

    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.value = 0;

    this.hornOsc1.connect(filter);
    this.hornOsc2.connect(filter);
    filter.connect(this.hornGain);
    this.hornGain.connect(this.fxMasterGain);

    this.hornOsc1.start();
    this.hornOsc2.start();
  }

  public setProfile(profile: SoundProfile) {
    this.currentProfile = profile;

    if (this.ctx && this.engineFilter) {
      const now = this.ctx.currentTime;
      this.engineFilter.frequency.setTargetAtTime(
        profile.filterIdle,
        now,
        0.05
      );

      if (this.subBassOsc) {
        this.subBassOsc.frequency.setTargetAtTime(
          profile.subBassFreq,
          now,
          0.05
        );
      }
    }
  }

  public getProfile(): SoundProfile {
    return this.currentProfile;
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : this.volumeSettings.master,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolumes(
    master?: number,
    engine?: number,
    wind?: number,
    traffic?: number
  ) {
    if (master !== undefined) {
      this.volumeSettings.master = Math.max(0, Math.min(1, master));
    }
    if (engine !== undefined) {
      this.volumeSettings.engine = Math.max(0, Math.min(1, engine));
    }
    if (wind !== undefined) {
      this.volumeSettings.wind = Math.max(0, Math.min(1, wind));
    }
    if (traffic !== undefined) {
      this.volumeSettings.traffic = Math.max(0, Math.min(1, traffic));
    }

    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(
        this.volumeSettings.master,
        t,
        0.05
      );
    }

    if (this.engineMasterGain) {
      this.engineMasterGain.gain.setTargetAtTime(
        this.volumeSettings.engine,
        t,
        0.05
      );
    }

    if (this.windMasterGain) {
      this.windMasterGain.gain.setTargetAtTime(
        this.volumeSettings.wind,
        t,
        0.05
      );
    }

    if (this.fxMasterGain) {
      this.fxMasterGain.gain.setTargetAtTime(
        this.volumeSettings.traffic,
        t,
        0.05
      );
    }
  }

  public updateEngine(
    speedKmh: number,
    rpmNorm: number,
    isThrottle: boolean,
    isBraking: boolean
  ) {
    if (!this.ctx || !this.isRunning || this.isMuted) return;

    const t = this.ctx.currentTime;
    const p = this.currentProfile;
    const rpm = Math.max(0, Math.min(1, rpmNorm));

    const maxRate = p.maxPulseFreq / Math.max(1, p.idlePulseFreq);
    const playbackRate =
      1 + (maxRate - 1) * Math.max(0, (rpm - 0.2) / 0.8);

    if (this.idleBufferSource) {
      this.idleBufferSource.playbackRate.setTargetAtTime(playbackRate, t, 0.05);
    }
    if (this.accelBufferSource) {
      this.accelBufferSource.playbackRate.setTargetAtTime(playbackRate, t, 0.05);
    }
    if (this.coastBufferSource) {
      this.coastBufferSource.playbackRate.setTargetAtTime(playbackRate, t, 0.05);
    }

    if (this.idleGain && this.accelGain && this.coastGain) {
      const highRpm = rpm > 0.35;

      let idleVol = 0;
      let accelVol = 0;
      let coastVol = 0;

      if (isThrottle) {
        accelVol = 0.45 + rpm * 0.35;
        idleVol = (1 - rpm) * 0.2;
      } else if (highRpm) {
        coastVol = 0.45 * rpm;
        idleVol = 0.25;
      } else {
        idleVol = 0.55;
      }

      this.idleGain.gain.setTargetAtTime(idleVol, t, 0.06);
      this.accelGain.gain.setTargetAtTime(accelVol, t, 0.06);
      this.coastGain.gain.setTargetAtTime(coastVol, t, 0.06);
    }

    if (this.subBassOsc && this.subBassGain) {
      const freq = p.subBassFreq * (1 + rpm * 0.65);
      this.subBassOsc.frequency.setTargetAtTime(freq, t, 0.05);

      const bassVol =
        (0.22 + rpm * 0.22 + (isThrottle ? 0.12 : 0)) *
        p.subBassDepth;

      this.subBassGain.gain.setTargetAtTime(bassVol, t, 0.06);
    }

    if (this.gearWhineOsc && this.gearWhineGain) {
      this.gearWhineOsc.frequency.setTargetAtTime(200 + rpm * 880, t, 0.04);

      const whineVol =
        p.gearWhine * (0.02 + rpm * 0.14) * (isThrottle ? 1 : 0.4);

      this.gearWhineGain.gain.setTargetAtTime(whineVol, t, 0.05);
    }

    if (this.engineFilter) {
      const throttleBoost = isThrottle ? 350 : 0;
      const cutoff =
        p.filterIdle + (p.filterMax - p.filterIdle) * rpm + throttleBoost;

      this.engineFilter.frequency.setTargetAtTime(
        Math.min(3200, cutoff),
        t,
        0.05
      );
    }

    if (
      this.lastThrottleState &&
      !isThrottle &&
      rpm > 0.45 &&
      p.overrunPop > 0.15
    ) {
      this.triggerOverrunPop(rpm);
    }

    this.lastThrottleState = isThrottle;

    if (this.windGain && this.windFilter) {
      const speedRatio = Math.min(Math.max(speedKmh, 0) / 160, 1);
      const windVol =
        speedRatio > 0.15 ? Math.pow(speedRatio, 1.7) * 0.42 : 0;

      this.windGain.gain.setTargetAtTime(windVol, t, 0.08);
      this.windFilter.frequency.setTargetAtTime(
        280 + speedRatio * 1700,
        t,
        0.08
      );
    }

    if (this.brakeGain) {
      const squeal = isBraking && speedKmh > 25;
      const brakeVol = squeal
        ? Math.min((speedKmh / 120) * 0.18, 0.22)
        : 0;

      this.brakeGain.gain.setTargetAtTime(brakeVol, t, 0.05);
    }
  }

  private triggerOverrunPop(rpmNorm: number) {
    if (!this.ctx || !this.engineMasterGain || this.isMuted) return;

    const now = Date.now();
    if (now - this.overrunTimer < 160) return;
    this.overrunTimer = now;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(85 + Math.random() * 55, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750 + rpmNorm * 500, t);

      gain.gain.setValueAtTime(0.22 * this.currentProfile.overrunPop, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.engineMasterGain);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch {
      // Ignore unsupported audio operations.
    }
  }

  public setHorn(active: boolean) {
    if (!this.ctx || !this.hornGain) return;

    this.hornGain.gain.setTargetAtTime(
      active ? 0.38 : 0,
      this.ctx.currentTime,
      0.02
    );
  }

  public playCloseCall() {
    if (!this.ctx || !this.fxMasterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(1760, t + 0.18);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.fxMasterGain);

      osc.start(t);
      osc.stop(t + 0.36);

      const whoosh = this.ctx.createOscillator();
      const whooshGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      whoosh.type = 'sawtooth';
      whoosh.frequency.setValueAtTime(420, t);
      whoosh.frequency.exponentialRampToValueAtTime(95, t + 0.28);

      filter.type = 'lowpass';
      filter.frequency.value = 900;

      whooshGain.gain.setValueAtTime(0.28, t);
      whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      whoosh.connect(filter);
      filter.connect(whooshGain);
      whooshGain.connect(this.fxMasterGain);

      whoosh.start(t);
      whoosh.stop(t + 0.32);
    } catch {
      // Ignore unsupported audio operations.
    }
  }

  public playCrash() {
    if (!this.ctx || !this.fxMasterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, t);
      subOsc.frequency.exponentialRampToValueAtTime(22, t + 0.65);

      subGain.gain.setValueAtTime(0.8, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

      subOsc.connect(subGain);
      subGain.connect(this.fxMasterGain);

      subOsc.start(t);
      subOsc.stop(t + 0.76);

      const size = Math.floor(this.ctx.sampleRate * 0.9);
      const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < size; i++) {
        data[i] =
          (Math.random() * 2 - 1) *
          Math.exp(-i / (this.ctx!.sampleRate * 0.28));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3600, t);
      filter.frequency.exponentialRampToValueAtTime(180, t + 0.65);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.72, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.75);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.fxMasterGain);

      noise.start(t);
      noise.stop(t + 0.77);
    } catch {
      // Ignore unsupported audio operations.
    }
  }

  public playGearShift() {
    if (!this.ctx || !this.fxMasterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.08);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.fxMasterGain);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch {
      // Ignore unsupported audio operations.
    }
  }

  public stopAll() {
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    if (this.idleGain) {
      this.idleGain.gain.setTargetAtTime(0, t, 0.05);
    }
    if (this.accelGain) {
      this.accelGain.gain.setTargetAtTime(0, t, 0.05);
    }
    if (this.coastGain) {
      this.coastGain.gain.setTargetAtTime(0, t, 0.05);
    }
    if (this.subBassGain) {
      this.subBassGain.gain.setTargetAtTime(0, t, 0.05);
    }
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(0, t, 0.05);
    }
    if (this.brakeGain) {
      this.brakeGain.gain.setTargetAtTime(0, t, 0.05);
    }
    if (this.hornGain) {
      this.hornGain.gain.setTargetAtTime(0, t, 0.05);
    }
  }
}

export const sounds = new SoundController();
