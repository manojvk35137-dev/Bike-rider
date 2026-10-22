/**
 * Realistic Procedural Web Audio Engine Synthesizer for Motorcycle Racing.
 * Synthesizes genuine 4-stroke single-cylinder combustion cadence,
 * deep peashooter exhaust thump, mechanical valve clatter, and dynamic overrun burbles.
 * Specially calibrated for the Royal Enfield Bullet 350 and all 7 motorcycle models.
 */

import { SoundProfile } from '../game/motorcycles';

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Sub-buses
  private engineMasterGain: GainNode | null = null;
  private windMasterGain: GainNode | null = null;
  private fxMasterGain: GainNode | null = null;

  public volumeSettings = {
    master: 0.85,
    engine: 0.9,
    traffic: 0.75,
    wind: 0.6,
  };

  // Engine Acoustic Nodes
  private idleBufferSource: AudioBufferSourceNode | null = null;
  private accelBufferSource: AudioBufferSourceNode | null = null;
  private coastBufferSource: AudioBufferSourceNode | null = null;
  private idleGain: GainNode | null = null;
  private accelGain: GainNode | null = null;
  private coastGain: GainNode | null = null;

  // Sub-bass fundamental thump oscillator (delivers the deep physical chest thump)
  private subBassOsc: OscillatorNode | null = null;
  private subBassGain: GainNode | null = null;

  // Primary reduction gear whine (Himalayan 411)
  private gearWhineOsc: OscillatorNode | null = null;
  private gearWhineGain: GainNode | null = null;

  // Master engine exhaust filter
  private engineFilter: BiquadFilterNode | null = null;

  // Overrun burble timer
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
    idlePulseFreq: 9.0, // ~1080 RPM heavy-crank idle cadence (~9 combustion strokes/sec)
    maxPulseFreq: 44, // ~5300 RPM redline
    subBassFreq: 34, // 34 Hz deep chest thump
    subBassDepth: 0.95,
    filterIdle: 280,
    filterMax: 1650,
    mechanicalClatter: 0.35,
    gearWhine: 0.08,
    overrunPop: 0.25,
    exhaustTone: 'deep-bullet-thump',
    exhaustDescription: 'Authentic 4-stroke single-cylinder combustion cadence with heavy crank peashooter thump.',
    disclaimer: 'High-fidelity procedural acoustic physical model simulating the single-cylinder 4-stroke combustion cadence (Bullet 350).',
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

      this.buildEngineAcousticLayers();
      this.setupWind();
      this.setupBrake();
      this.setupHorn();
      this.isRunning = true;
    } catch {
      // Audio not supported or blocked by browser policy
    }
  }

  /**
   * Generates authentic 4-stroke single-cylinder combustion pulse buffers:
   * 1. Idle Layer: Discrete, deep, heavy-crank exhaust thumps (dug-dug-dug cadence).
   * 2. Acceleration Layer: Intense combustion explosions with airflow bark and silencer resonance.
   * 3. Coast / Overrun Layer: Muffled engine braking with gentle acoustic pressure relief.
   */
  private buildEngineAcousticLayers() {
    if (!this.ctx || !this.engineMasterGain) return;

    const sampleRate = this.ctx.sampleRate;
    const duration = 2.0; // 2 second seamlessly looping pulse trains
    const totalSamples = Math.floor(sampleRate * duration);

    // Common master lowpass filter shaping the exhaust tone
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(this.currentProfile.filterIdle, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.2, this.ctx.currentTime);

    // -------------------------------------------------------------
    // BUFFER 1: IDLE - Discrete rhythmic single-cylinder thump
    // ~9 distinct combustion impulses per second
    // -------------------------------------------------------------
    const idleBuffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const idleData = idleBuffer.getChannelData(0);
    const idlePulsePeriod = sampleRate / 9.0;

    for (let i = 0; i < totalSamples; i++) {
      const posInPulse = (i % idlePulsePeriod) / sampleRate; // seconds into this pulse
      let sample = 0;

      if (posInPulse < 0.08) {
        // High-pressure combustion stroke: sharp initial shockwave decaying into muffler resonance
        const decay = Math.exp(-posInPulse * 65);
        // Peashooter muffler cavity resonance (125 Hz fundamental with warm odd harmonics)
        const mufflerResonance = Math.sin(2 * Math.PI * 125 * posInPulse) * 0.7
          + Math.sin(2 * Math.PI * 250 * posInPulse) * 0.35
          + Math.sin(2 * Math.PI * 375 * posInPulse) * 0.15;
        // Mechanical valve-seat click on combustion top dead center
        const valveSnap = (posInPulse < 0.005) ? (Math.random() * 2 - 1) * 0.45 : 0;

        sample = (mufflerResonance + valveSnap) * decay;
      }
      idleData[i] = sample;
    }

    // -------------------------------------------------------------
    // BUFFER 2: ACCELERATION - Throatier, high-airflow combustion bark
    // -------------------------------------------------------------
    const accelBuffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const accelData = accelBuffer.getChannelData(0);

    for (let i = 0; i < totalSamples; i++) {
      const posInPulse = (i % idlePulsePeriod) / sampleRate;
      let sample = 0;

      if (posInPulse < 0.09) {
        const decay = Math.exp(-posInPulse * 45);
        // More aggressive, open baffle resonance with rich mid-range growl
        const exhaustBark = Math.sin(2 * Math.PI * 135 * posInPulse) * 0.6
          + Math.sin(2 * Math.PI * 270 * posInPulse) * 0.5
          + Math.sin(2 * Math.PI * 405 * posInPulse) * 0.35
          + (Math.random() * 2 - 1) * 0.25;

        sample = exhaustBark * decay;
      }
      accelData[i] = sample;
    }

    // -------------------------------------------------------------
    // BUFFER 3: COAST / DECELERATION - Low-pressure muffled engine braking
    // -------------------------------------------------------------
    const coastBuffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const coastData = coastBuffer.getChannelData(0);

    for (let i = 0; i < totalSamples; i++) {
      const posInPulse = (i % idlePulsePeriod) / sampleRate;
      let sample = 0;

      if (posInPulse < 0.07) {
        const decay = Math.exp(-posInPulse * 80);
        // Soft, hollow, compressed exhaust pulse
        const hollowChug = Math.sin(2 * Math.PI * 110 * posInPulse) * 0.8
          + Math.sin(2 * Math.PI * 220 * posInPulse) * 0.2;
        sample = hollowChug * decay * 0.65;
      }
      coastData[i] = sample;
    }

    // Create Loop Sources
    this.idleBufferSource = this.ctx.createBufferSource();
    this.idleBufferSource.buffer = idleBuffer;
    this.idleBufferSource.loop = true;

    this.accelBufferSource = this.ctx.createBufferSource();
    this.accelBufferSource.buffer = accelBuffer;
    this.accelBufferSource.loop = true;

    this.coastBufferSource = this.ctx.createBufferSource();
    this.coastBufferSource.buffer = coastBuffer;
    this.coastBufferSource.loop = true;

    // Gains for dynamic cross-fading
    this.idleGain = this.ctx.createGain();
    this.idleGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

    this.accelGain = this.ctx.createGain();
    this.accelGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.coastGain = this.ctx.createGain();
    this.coastGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Connect layers to exhaust filter
    this.idleBufferSource.connect(this.idleGain);
    this.accelBufferSource.connect(this.accelGain);
    this.coastBufferSource.connect(this.coastGain);

    this.idleGain.connect(this.engineFilter);
    this.accelGain.connect(this.engineFilter);
    this.coastGain.connect(this.engineFilter);

    // 4. Sub-Bass Chest Thump Oscillator (tuned Sine tracking combustion frequency)
    this.subBassOsc = this.ctx.createOscillator();
    this.subBassOsc.type = 'sine';
    this.subBassOsc.frequency.setValueAtTime(this.currentProfile.subBassFreq, this.ctx.currentTime);

    this.subBassGain = this.ctx.createGain();
    this.subBassGain.gain.setValueAtTime(0.28, this.ctx.currentTime);

    this.subBassOsc.connect(this.subBassGain);
    this.subBassGain.connect(this.engineFilter);

    // 5. Primary Reduction Gear Whine (Himalayan 411)
    this.gearWhineOsc = this.ctx.createOscillator();
    this.gearWhineOsc.type = 'triangle';
    this.gearWhineOsc.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.gearWhineGain = this.ctx.createGain();
    this.gearWhineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.gearWhineOsc.connect(this.gearWhineGain);
    this.gearWhineGain.connect(this.engineFilter);

    // Connect exhaust filter to engine master bus
    this.engineFilter.connect(this.engineMasterGain);

    // Start all audio loop sources simultaneously
    this.idleBufferSource.start();
    this.accelBufferSource.start();
    this.coastBufferSource.start();
    this.subBassOsc.start();
    this.gearWhineOsc.start();
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

  /**
   * Updates real-time dynamic engine parameters based on speed, RPM, throttle, and bike profile.
   * Completely smooth crossfades and playback rate modulation based on physical RPM cadence.
   */
  public updateEngine(speedKmh: number, rpmNorm: number, isThrottle: boolean, isBraking: boolean) {
    if (!this.ctx || !this.isRunning || this.isMuted) return;

    const t = this.ctx.currentTime;
    const p = this.currentProfile;
    const clampedRpm = Math.max(0, Math.min(1, rpmNorm));

    // 1. Physical Playback Rate Modulation:
    // At idle (rpmNorm = 0.2), rate is 1.0 (9 thumps/sec).
    // At redline (rpmNorm = 1.0), rate smoothly scales up to (maxPulseFreq / idlePulseFreq)
    const maxRate = p.maxPulseFreq / p.idlePulseFreq;
    const targetPlaybackRate = 1.0 + (maxRate - 1.0) * Math.max(0, (clampedRpm - 0.2) / 0.8);

    if (this.idleBufferSource) {
      this.idleBufferSource.playbackRate.setTargetAtTime(targetPlaybackRate, t, 0.05);
    }
    if (this.accelBufferSource) {
      this.accelBufferSource.playbackRate.setTargetAtTime(targetPlaybackRate, t, 0.05);
    }
    if (this.coastBufferSource) {
      this.coastBufferSource.playbackRate.setTargetAtTime(targetPlaybackRate, t, 0.05);
    }

    // 2. Dynamic Layer Cross-Fading:
    // Idle layer dominates when throttle is low
    // Acceleration layer swells when throttle is held
    // Coast layer engages when throttle is lifted at high RPM (engine braking)
    if (this.idleGain && this.accelGain && this.coastGain) {
      const isHighRpm = clampedRpm > 0.35;

      let targetIdleVol = 0;
      let targetAccelVol = 0;
      let targetCoastVol = 0;

      if (isThrottle) {
        targetAccelVol = 0.45 + clampedRpm * 0.35;
        targetIdleVol = (1 - clampedRpm) * 0.2;
        targetCoastVol = 0.0;
      } else if (isHighRpm) {
        // Coasting / engine braking
        targetCoastVol = 0.45 * clampedRpm;
        targetIdleVol = 0.25;
        targetAccelVol = 0.0;
      } else {
        // Idle
        targetIdleVol = 0.55;
        targetAccelVol = 0.0;
        targetCoastVol = 0.0;
      }

      this.idleGain.gain.setTargetAtTime(targetIdleVol, t, 0.06);
      this.accelGain.gain.setTargetAtTime(targetAccelVol, t, 0.06);
      this.coastGain.gain.setTargetAtTime(targetCoastVol, t, 0.06);
    }

    // 3. Sub-Bass Thump Pitch & Volume:
    // Follows the fundamental pressure wave (34–68 Hz)
    if (this.subBassOsc && this.subBassGain) {
      const targetSubFreq = p.subBassFreq * (1 + clampedRpm * 0.85);
      this.subBassOsc.frequency.setTargetAtTime(targetSubFreq, t, 0.05);

      const targetSubVol = (0.2 + clampedRpm * 0.25 + (isThrottle ? 0.15 : 0)) * p.subBassDepth;
      this.subBassGain.gain.setTargetAtTime(targetSubVol, t, 0.06);
    }

    // 4. Primary Reduction Gear Whine (Himalayan 411 LS410 signature)
    if (this.gearWhineOsc && this.gearWhineGain) {
      const whineFreq = 200 + clampedRpm * 880;
      this.gearWhineOsc.frequency.setTargetAtTime(whineFreq, t, 0.04);

      const targetWhineVol = p.gearWhine * (0.02 + clampedRpm * 0.14) * (isThrottle ? 1.0 : 0.4);
      this.gearWhineGain.gain.setTargetAtTime(targetWhineVol, t, 0.05);
    }

    // 5. Dynamic Exhaust Lowpass Resonator Filter:
    // Sweeps from filterIdle up to filterMax on acceleration
    if (this.engineFilter) {
      const throttleBoost = isThrottle ? 400 : 0;
      const targetCutoff = p.filterIdle + (p.filterMax - p.filterIdle) * clampedRpm + throttleBoost;
      this.engineFilter.frequency.setTargetAtTime(Math.min(3200, targetCutoff), t, 0.05);
    }

    // 6. Deceleration Overrun Burble Pops on throttle release at high RPM
    if (this.lastThrottleState && !isThrottle && clampedRpm > 0.45 && p.overrunPop > 0.15) {
      this.triggerOverrunPop(clampedRpm);
    }
    this.lastThrottleState = isThrottle;

    // 7. Wind Turbulence Noise (scaling naturally with speed)
    if (this.windGain && this.windFilter) {
      const speedRatio = Math.min(speedKmh / 160, 1.0);
      const windVol = speedRatio > 0.15 ? Math.pow(speedRatio, 1.7) * 0.42 : 0;
      this.windGain.gain.setTargetAtTime(windVol, t, 0.08);
      this.windFilter.frequency.setTargetAtTime(280 + speedRatio * 1700, t, 0.08);
    }

    // 8. Brake Squeal on hard braking
    if (this.brakeGain) {
      const shouldSqueal = isBraking && speedKmh > 25;
      const brakeVol = shouldSqueal ? Math.min((speedKmh / 120) * 0.18, 0.22) : 0;
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
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      const popFilter = this.ctx.createBiquadFilter();

      popOsc.type = 'sawtooth';
      popOsc.frequency.setValueAtTime(85 + Math.random() * 55, t);
      popOsc.frequency.exponentialRampToValueAtTime(32, t + 0.08);

      popFilter.type = 'lowpass';
      popFilter.frequency.setValueAtTime(750 + rpmNorm * 500, t);

      const popVol = 0.22 * this.currentProfile.overrunPop;
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

      // Doppler whoosh
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
    if (this.idleGain && this.ctx) {
      this.idleGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.accelGain && this.ctx) {
      this.accelGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.coastGain && this.ctx) {
      this.coastGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.subBassGain && this.ctx) {
      this.subBassGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
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
