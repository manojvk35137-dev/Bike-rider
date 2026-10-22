/**
 * Advanced Procedural Web Audio API sound generator for motorcycle racing.
 * Physically simulated multi-oscillator engine acoustic synthesis
 * tailored to all 7 Royal Enfield single-cylinder engine architectures.
 */

import { SoundProfile } from '../game/motorcycles';

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Volume channels
  private engineMasterGain: GainNode | null = null;
  private windMasterGain: GainNode | null = null;
  private fxMasterGain: GainNode | null = null;

  public volumeSettings = {
    master: 0.85,
    engine: 0.9,
    traffic: 0.75,
    wind: 0.65,
  };

  // Engine audio nodes
  private pulseOsc: OscillatorNode | null = null;       // Main 4-stroke power combustion stroke
  private subBassOsc: OscillatorNode | null = null;     // Low-end single-cylinder chest thump
  private mechanicalNoiseNode: AudioBufferSourceNode | null = null; // Valve / tappet clatter
  private mechanicalGain: GainNode | null = null;
  private mechanicalFilter: BiquadFilterNode | null = null;
  private gearWhineOsc: OscillatorNode | null = null;   // Primary drive gear whine (Himalayan 411)
  private gearWhineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;  // Dynamic exhaust resonator filter
  private engineGain: GainNode | null = null;

  // Deceleration overrun pops
  private lastThrottleState: boolean = false;
  private overrunTimer: number = 0;

  // Wind turbulence audio nodes
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windNoiseNode: AudioBufferSourceNode | null = null;

  // Brake squeal nodes
  private brakeGain: GainNode | null = null;
  private brakeOsc: OscillatorNode | null = null;

  // Horn nodes
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;

  // Current engine profile settings (initialized to Bullet 350 default)
  private currentProfile: SoundProfile = {
    id: 'bullet-350-sound',
    name: 'Bullet 350 Traditional Peashooter Thump',
    idlePulseFreq: 9.2,
    maxPulseFreq: 45,
    subBassFreq: 35,
    subBassDepth: 0.92,
    filterIdle: 280,
    filterMax: 1600,
    mechanicalClatter: 0.35,
    gearWhine: 0.08,
    overrunPop: 0.18,
    exhaustTone: 'deep-bullet-thump',
    exhaustDescription: 'Traditional straight-pipe peashooter silencer with heavy low-RPM rhythmic thump.',
    disclaimer: 'High-fidelity procedural Web Audio physical simulation of Bullet 350 single-cylinder combustion cycle.',
  };

  private isRunning: boolean = false;

  constructor() {}

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volumeSettings.master, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Sub-buses
      this.engineMasterGain = this.ctx.createGain();
      this.engineMasterGain.gain.setValueAtTime(this.volumeSettings.engine, this.ctx.currentTime);
      this.engineMasterGain.connect(this.masterGain);

      this.windMasterGain = this.ctx.createGain();
      this.windMasterGain.gain.setValueAtTime(this.volumeSettings.wind, this.ctx.currentTime);
      this.windMasterGain.connect(this.masterGain);

      this.fxMasterGain = this.ctx.createGain();
      this.fxMasterGain.gain.setValueAtTime(this.volumeSettings.traffic, this.ctx.currentTime);
      this.fxMasterGain.connect(this.masterGain);

      this.setupEngine();
      this.setupWind();
      this.setupBrake();
      this.setupHorn();
      this.isRunning = true;
    } catch {
      // Audio not supported or blocked
    }
  }

  public setProfile(profile: SoundProfile) {
    this.currentProfile = profile;
    if (this.ctx && this.engineFilter) {
      this.engineFilter.frequency.setTargetAtTime(profile.filterIdle, this.ctx.currentTime, 0.05);
    }
  }

  public getProfile(): SoundProfile {
    return this.currentProfile;
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volumeSettings.master, this.ctx.currentTime, 0.05);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolumes(master?: number, engine?: number, wind?: number, traffic?: number) {
    if (master !== undefined) this.volumeSettings.master = Math.max(0, Math.min(1, master));
    if (engine !== undefined) this.volumeSettings.engine = Math.max(0, Math.min(1, engine));
    if (wind !== undefined) this.volumeSettings.wind = Math.max(0, Math.min(1, wind));
    if (traffic !== undefined) this.volumeSettings.traffic = Math.max(0, Math.min(1, traffic));

    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volumeSettings.master, t, 0.05);
    }
    if (this.engineMasterGain) {
      this.engineMasterGain.gain.setTargetAtTime(this.volumeSettings.engine, t, 0.05);
    }
    if (this.windMasterGain) {
      this.windMasterGain.gain.setTargetAtTime(this.volumeSettings.wind, t, 0.05);
    }
    if (this.fxMasterGain) {
      this.fxMasterGain.gain.setTargetAtTime(this.volumeSettings.traffic, t, 0.05);
    }
  }

  private setupEngine() {
    if (!this.ctx || !this.engineMasterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    // Resonant exhaust chamber filter
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(this.currentProfile.filterIdle, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.8, this.ctx.currentTime);

    // 1. Primary Combustion Firing Pulse (Sawtooth produces authentic mechanical exhaust snap)
    this.pulseOsc = this.ctx.createOscillator();
    this.pulseOsc.type = 'sawtooth';
    this.pulseOsc.frequency.setValueAtTime(this.currentProfile.idlePulseFreq * 2, this.ctx.currentTime);

    // 2. Sub-Bass Fundamental Thump (Deep sine wave giving the physical chest thump)
    this.subBassOsc = this.ctx.createOscillator();
    this.subBassOsc.type = 'sine';
    this.subBassOsc.frequency.setValueAtTime(this.currentProfile.subBassFreq, this.ctx.currentTime);

    // 3. Primary Reduction Gear Whine (Iconic on Himalayan 411 LS410 engine)
    this.gearWhineOsc = this.ctx.createOscillator();
    this.gearWhineOsc.type = 'triangle';
    this.gearWhineOsc.frequency.setValueAtTime(240, this.ctx.currentTime);

    this.gearWhineGain = this.ctx.createGain();
    this.gearWhineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.gearWhineOsc.connect(this.gearWhineGain);
    this.gearWhineGain.connect(this.engineGain);

    // 4. Mechanical Tappet / Cam Chain Clatter Generator
    const noiseBufferSize = this.ctx.sampleRate * 1.5;
    const clatterBuffer = this.ctx.createBuffer(1, noiseBufferSize, this.ctx.sampleRate);
    const cData = clatterBuffer.getChannelData(0);
    for (let i = 0; i < noiseBufferSize; i++) {
      // Periodic clicks mimicking pushrod tappet slaps
      const click = (i % 800 < 40) ? (Math.random() * 2 - 1) * 0.9 : (Math.random() * 2 - 1) * 0.08;
      cData[i] = click;
    }

    this.mechanicalNoiseNode = this.ctx.createBufferSource();
    this.mechanicalNoiseNode.buffer = clatterBuffer;
    this.mechanicalNoiseNode.loop = true;

    this.mechanicalFilter = this.ctx.createBiquadFilter();
    this.mechanicalFilter.type = 'bandpass';
    this.mechanicalFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
    this.mechanicalFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    this.mechanicalGain = this.ctx.createGain();
    this.mechanicalGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.mechanicalNoiseNode.connect(this.mechanicalFilter);
    this.mechanicalFilter.connect(this.mechanicalGain);
    this.mechanicalGain.connect(this.engineGain);

    // Connect oscillators to filter & gain
    this.pulseOsc.connect(this.engineFilter);
    this.subBassOsc.connect(this.engineFilter);

    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.engineMasterGain);

    this.pulseOsc.start();
    this.subBassOsc.start();
    this.gearWhineOsc.start();
    this.mechanicalNoiseNode.start();
  }

  private setupWind() {
    if (!this.ctx || !this.windMasterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.12;
    }

    this.windNoiseNode = this.ctx.createBufferSource();
    this.windNoiseNode.buffer = noiseBuffer;
    this.windNoiseNode.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.1, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.windNoiseNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.windMasterGain);

    this.windNoiseNode.start();
  }

  private setupBrake() {
    if (!this.ctx || !this.fxMasterGain) return;

    this.brakeOsc = this.ctx.createOscillator();
    this.brakeOsc.type = 'sine';
    this.brakeOsc.frequency.setValueAtTime(2600, this.ctx.currentTime);

    const brakeFilter = this.ctx.createBiquadFilter();
    brakeFilter.type = 'bandpass';
    brakeFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
    brakeFilter.Q.setValueAtTime(9, this.ctx.currentTime);

    this.brakeGain = this.ctx.createGain();
    this.brakeGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.brakeOsc.connect(brakeFilter);
    brakeFilter.connect(this.brakeGain);
    this.brakeGain.connect(this.fxMasterGain);

    this.brakeOsc.start();
  }

  private setupHorn() {
    if (!this.ctx || !this.fxMasterGain) return;

    // Classic dual-tone disc horn (440Hz A4 + 554Hz C#5 major third interval)
    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc1.type = 'sawtooth';
    this.hornOsc1.frequency.setValueAtTime(440, this.ctx.currentTime);

    this.hornOsc2 = this.ctx.createOscillator();
    this.hornOsc2.type = 'triangle';
    this.hornOsc2.frequency.setValueAtTime(554.37, this.ctx.currentTime);

    const hornFilter = this.ctx.createBiquadFilter();
    hornFilter.type = 'lowpass';
    hornFilter.frequency.setValueAtTime(1700, this.ctx.currentTime);

    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.hornOsc1.connect(hornFilter);
    this.hornOsc2.connect(hornFilter);
    hornFilter.connect(this.hornGain);
    this.hornGain.connect(this.fxMasterGain);

    this.hornOsc1.start();
    this.hornOsc2.start();
  }

  /**
   * Updates real-time dynamic engine parameters based on speed, RPM, throttle, and bike profile.
   */
  public updateEngine(speedKmh: number, rpmNorm: number, isThrottle: boolean, isBraking: boolean) {
    if (!this.ctx || !this.isRunning || this.isMuted) return;

    const t = this.ctx.currentTime;
    const p = this.currentProfile;

    // 1. Calculate actual firing pulse frequency:
    // Interpolates from idlePulseFreq to maxPulseFreq based on normalized RPM
    const clampedRpm = Math.max(0, Math.min(1, rpmNorm));
    const targetPulseFreq = p.idlePulseFreq + (p.maxPulseFreq - p.idlePulseFreq) * Math.pow(clampedRpm, 1.15);

    // Combustion pulse frequency (scaled by 2 for audio perception harmonic)
    if (this.pulseOsc) {
      this.pulseOsc.frequency.setTargetAtTime(targetPulseFreq * 2.1, t, 0.04);
    }

    // 2. Sub-bass thump frequency (fundamental combustion punch)
    if (this.subBassOsc) {
      const subFreq = p.subBassFreq + clampedRpm * 38;
      this.subBassOsc.frequency.setTargetAtTime(subFreq, t, 0.04);
    }

    // 3. Primary reduction gear whine (Himalayan 411 feature)
    if (this.gearWhineOsc && this.gearWhineGain) {
      const whineFreq = 180 + clampedRpm * 920;
      this.gearWhineOsc.frequency.setTargetAtTime(whineFreq, t, 0.03);

      const targetWhineVol = p.gearWhine * (0.02 + clampedRpm * 0.12) * (isThrottle ? 1.0 : 0.4);
      this.gearWhineGain.gain.setTargetAtTime(targetWhineVol, t, 0.04);
    }

    // 4. Mechanical clatter
    if (this.mechanicalGain) {
      const clatterVol = p.mechanicalClatter * (0.04 + (1 - clampedRpm * 0.5) * 0.06);
      this.mechanicalGain.gain.setTargetAtTime(clatterVol, t, 0.05);
    }

    // 5. Dynamic exhaust resonator lowpass filter
    if (this.engineFilter) {
      // Full throttle opens up the exhaust baffle
      const throttleBoost = isThrottle ? 450 : 0;
      const targetCutoff = p.filterIdle + (p.filterMax - p.filterIdle) * clampedRpm + throttleBoost;
      this.engineFilter.frequency.setTargetAtTime(Math.min(3600, targetCutoff), t, 0.04);
    }

    // 6. Overall Engine gain
    if (this.engineGain) {
      const baseGain = isThrottle ? 0.38 : 0.18;
      const rpmGain = clampedRpm * 0.32;
      const targetGain = (baseGain + rpmGain) * (0.7 + p.subBassDepth * 0.3);
      this.engineGain.gain.setTargetAtTime(targetGain, t, 0.04);
    }

    // 7. Deceleration overrun pops / crackles on sudden throttle release at high RPM
    if (this.lastThrottleState && !isThrottle && clampedRpm > 0.45 && p.overrunPop > 0.15) {
      this.triggerOverrunPop(clampedRpm);
    }
    this.lastThrottleState = isThrottle;

    // 8. Wind turbulence noise scaling with velocity
    if (this.windGain && this.windFilter) {
      const speedRatio = Math.min(speedKmh / 160, 1.0);
      const windVol = speedRatio > 0.12 ? Math.pow(speedRatio, 1.6) * 0.42 : 0;
      this.windGain.gain.setTargetAtTime(windVol, t, 0.07);
      this.windFilter.frequency.setTargetAtTime(280 + speedRatio * 1800, t, 0.07);
    }

    // 9. Brake squeal
    if (this.brakeGain) {
      const shouldSqueal = isBraking && speedKmh > 20;
      const brakeVol = shouldSqueal ? Math.min((speedKmh / 120) * 0.18, 0.22) : 0;
      this.brakeGain.gain.setTargetAtTime(brakeVol, t, 0.05);
    }
  }

  private triggerOverrunPop(rpmNorm: number) {
    if (!this.ctx || !this.engineMasterGain || this.isMuted) return;
    const now = Date.now();
    if (now - this.overrunTimer < 180) return;
    this.overrunTimer = now;

    try {
      const t = this.ctx.currentTime;
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      const popFilter = this.ctx.createBiquadFilter();

      popOsc.type = 'sawtooth';
      popOsc.frequency.setValueAtTime(80 + Math.random() * 60, t);
      popOsc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

      popFilter.type = 'lowpass';
      popFilter.frequency.setValueAtTime(800 + rpmNorm * 600, t);

      const popVol = 0.25 * this.currentProfile.overrunPop;
      popGain.gain.setValueAtTime(popVol, t);
      popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      popOsc.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(this.engineMasterGain);

      popOsc.start(t);
      popOsc.stop(t + 0.1);
    } catch {
      // Audio fallback
    }
  }

  public setHorn(active: boolean) {
    if (!this.ctx || !this.hornGain) return;
    const t = this.ctx.currentTime;
    this.hornGain.gain.setTargetAtTime(active ? 0.38 : 0, t, 0.02);
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

      // Dopler whoosh
      const whooshOsc = this.ctx.createOscillator();
      const whooshGain = this.ctx.createGain();
      const whooshFilter = this.ctx.createBiquadFilter();

      whooshOsc.type = 'sawtooth';
      whooshOsc.frequency.setValueAtTime(420, t);
      whooshOsc.frequency.exponentialRampToValueAtTime(95, t + 0.28);

      whooshFilter.type = 'lowpass';
      whooshFilter.frequency.setValueAtTime(900, t);

      whooshGain.gain.setValueAtTime(0.28, t);
      whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      whooshOsc.connect(whooshFilter);
      whooshFilter.connect(whooshGain);
      whooshGain.connect(this.fxMasterGain);

      whooshOsc.start(t);
      whooshOsc.stop(t + 0.32);
    } catch {
      // Audio fallback
    }
  }

  public playCrash() {
    if (!this.ctx || !this.fxMasterGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;

      // Heavy sub-bass impact boom
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

      // Metal crunch and debris noise
      const bufferSize = this.ctx.sampleRate * 0.9;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.28));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

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
      // Audio fallback
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
      // Audio fallback
    }
  }

  public stopAll() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.windGain && this.ctx) {
      this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.brakeGain && this.ctx) {
      this.brakeGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.hornGain && this.ctx) {
      this.hornGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }
}

export const sounds = new SoundController();
