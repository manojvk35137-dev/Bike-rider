export interface CockpitStyle {
  dashType: 'classic-nacelle' | 'classic-500' | 'hunter-asymmetric' | 'himalayan-411-multi' | 'himalayan-450-tft' | 'guerrilla-tft';
  windshieldType: 'none' | 'small-cowl' | 'tall-adv-411' | 'aero-adv-450';
  mirrorType: 'vintage-chrome-round' | 'classic-oval' | 'adv-rugged' | 'modern-roadster';
  handlebarType: 'swept-touring' | 'classic-chrome' | 'flat-roadster' | 'wide-adv' | 'tracker-scrambler';
  hasExoCage?: boolean;
  forkColor: number;
  primaryColor: number;
  accentColor: number;
}

export interface SoundProfile {
  id: string;
  name: string;
  idlePulseFreq: number; // Hz (4-stroke single cylinder firing rate at idle)
  maxPulseFreq: number; // Hz (firing rate at max RPM)
  subBassFreq: number; // Hz (deep low-end exhaust rumble)
  subBassDepth: number; // 0.0 - 1.0 (weight of the sub thump)
  filterIdle: number; // Hz (exhaust lowpass cutoff at idle)
  filterMax: number; // Hz (exhaust lowpass cutoff at full throttle)
  mechanicalClatter: number; // 0.0 - 1.0 (valve train / tappet mechanical click)
  gearWhine: number; // 0.0 - 1.0 (primary reduction gear whine - iconic on Himalayan 411)
  overrunPop: number; // 0.0 - 1.0 (exhaust backfire / burble pops on throttle lift)
  exhaustTone: 'deep-bullet-thump' | 'classic-mellow-thump' | 'heavy-500-bass' | 'raspy-roadster' | 'ls410-tractor-chug' | 'sherpa-dohc-adv' | 'sherpa-scrambler-bark';
  exhaustDescription: string;
  disclaimer: string;
}

export interface MotorcycleConfig {
  id: string;
  name: string;
  series: string;
  badge: string;
  displacementCc: number;
  engineType: string;
  cooling: string;
  powerBhp: number;
  torqueNm: number;
  topSpeedKmh: number;
  accelerationScore: number; // 1-10
  handlingScore: number; // 1-10
  brakingScore: number; // 1-10
  accelRate: number; // km/h per sec
  steerRate: number;
  brakeRate: number;
  cockpit: CockpitStyle;
  sound: SoundProfile;
  description: string;
  modelLegalNote: string;
}

export const MOTORCYCLE_REGISTRY: MotorcycleConfig[] = [
  {
    id: 'bullet-350',
    name: 'Bullet 350',
    series: 'Heritage Classic',
    badge: 'ICONIC HEAVY CRANK',
    displacementCc: 349,
    engineType: 'J-Series Single-Cylinder SOHC 2-Valve',
    cooling: 'Air-Oil Cooled',
    powerBhp: 20.2,
    torqueNm: 27.0,
    topSpeedKmh: 118,
    accelerationScore: 5.6,
    handlingScore: 6.8,
    brakingScore: 6.9,
    accelRate: 15.0,
    steerRate: 7.2,
    brakeRate: 36,
    cockpit: {
      dashType: 'classic-nacelle',
      windshieldType: 'none',
      mirrorType: 'vintage-chrome-round',
      handlebarType: 'swept-touring',
      forkColor: 0xd0d5dd,
      primaryColor: 0x141416,
      accentColor: 0xd4af37,
    },
    sound: {
      id: 'bullet-350-sound',
      name: 'Bullet 350 Traditional Peashooter Thump',
      idlePulseFreq: 9.0, // ~1080 RPM idle, traditional slow heavy crank
      maxPulseFreq: 44, // ~5300 RPM redline
      subBassFreq: 34, // Deep 34 Hz chest thump
      subBassDepth: 0.95,
      filterIdle: 280,
      filterMax: 1650,
      mechanicalClatter: 0.35, // Characteristic pushrod/valve slap
      gearWhine: 0.08,
      overrunPop: 0.25,
      exhaustTone: 'deep-bullet-thump',
      exhaustDescription: 'Traditional straight-pipe peashooter silencer with a heavy, pronounced low-RPM rhythmic thump.',
      disclaimer: 'Procedural acoustic physical model simulating Bullet 350 single-cylinder combustion cadence (not an official factory field recording).',
    },
    description: 'The legendary standard motorcycle with upright relaxed riding stance, vintage casquette headlamp nacelle, and iconic steady long-stroke cadence.',
    modelLegalNote: 'Procedural 3D model approximation of Bullet 350 classic casquette & vintage analog dial.',
  },
  {
    id: 'classic-350',
    name: 'Classic 350',
    series: 'Timeless Cruiser',
    badge: 'SMOOTH J-SERIES CRUISER',
    displacementCc: 349,
    engineType: 'J-Series Single-Cylinder SOHC Counterbalanced',
    cooling: 'Air-Oil Cooled',
    powerBhp: 20.2,
    torqueNm: 27.0,
    topSpeedKmh: 122,
    accelerationScore: 5.9,
    handlingScore: 7.2,
    brakingScore: 7.4,
    accelRate: 16.0,
    steerRate: 7.4,
    brakeRate: 38,
    cockpit: {
      dashType: 'classic-nacelle',
      windshieldType: 'none',
      mirrorType: 'vintage-chrome-round',
      handlebarType: 'classic-chrome',
      forkColor: 0xe5e7eb,
      primaryColor: 0x163327, // Halcyon Green
      accentColor: 0xc0c8d4,
    },
    sound: {
      id: 'classic-350-sound',
      name: 'Classic 350 Counterbalanced Mellow Thump',
      idlePulseFreq: 9.6, // ~1150 RPM smooth idle
      maxPulseFreq: 46, // ~5500 RPM
      subBassFreq: 36,
      subBassDepth: 0.85,
      filterIdle: 260,
      filterMax: 1500,
      mechanicalClatter: 0.18, // Smoother, quiet primary drive
      gearWhine: 0.05,
      overrunPop: 0.16,
      exhaustTone: 'classic-mellow-thump',
      exhaustDescription: 'Smooth counterbalanced J-series firing order with mellow bottle-silencer resonance.',
      disclaimer: 'Procedural acoustic physical model simulating Classic 350 counterbalanced J-series engine (not an official factory field recording).',
    },
    description: 'Post-war heritage roadster styling with teardrop tank contours, signature casquette with twin tiger-eye pilot lamps, and balanced touring comfort.',
    modelLegalNote: 'Procedural 3D model approximation of Classic 350 nacelle & retro chrome instruments.',
  },
  {
    id: 'bullet-500',
    name: 'Bullet 500',
    series: 'Big-Bore Heritage',
    badge: '499cc HIGH-TORQUE THUMP',
    displacementCc: 499,
    engineType: 'UCE 500cc High-Torque Single-Cylinder',
    cooling: 'Air Cooled',
    powerBhp: 27.2,
    torqueNm: 41.3,
    topSpeedKmh: 132,
    accelerationScore: 7.1,
    handlingScore: 6.4,
    brakingScore: 7.0,
    accelRate: 19.5,
    steerRate: 7.0,
    brakeRate: 40,
    cockpit: {
      dashType: 'classic-500',
      windshieldType: 'none',
      mirrorType: 'vintage-chrome-round',
      handlebarType: 'swept-touring',
      forkColor: 0xcbd5e1,
      primaryColor: 0x1b281d, // Forest Green
      accentColor: 0xd4af37,
    },
    sound: {
      id: 'bullet-500-sound',
      name: 'UCE 500 Big-Bore Bass Boom',
      idlePulseFreq: 8.4, // ~1000 RPM lazy, massive piston displacement
      maxPulseFreq: 42, // ~5000 RPM
      subBassFreq: 28, // Ultra-low 28 Hz bass thump
      subBassDepth: 1.0,
      filterIdle: 220,
      filterMax: 1300,
      mechanicalClatter: 0.42, // Distinct heavy UCE mechanical presence
      gearWhine: 0.1,
      overrunPop: 0.38, // Heavy deceleration rumble
      exhaustTone: 'heavy-500-bass',
      exhaustDescription: 'Thunderous 499cc large-bore single-cylinder firing pulse with massive low-frequency sub-bass reverberation.',
      disclaimer: 'High-fidelity procedural Web Audio physical simulation of 499cc UCE heavy-crank combustion pulses.',
    },
    description: 'Raw vintage power with 41.3 Nm of guttural low-end torque. Features the deep iconic UCE 500 heavy crank thump that pulls relentlessly from any gear.',
    modelLegalNote: 'Procedural 3D model approximation of big-bore Bullet 500 classic casquette.',
  },
  {
    id: 'hunter-350',
    name: 'Hunter 350',
    series: 'Urban Roadster',
    badge: 'NIMBLE 17-INCH ROADSTER',
    displacementCc: 349,
    engineType: 'J-Series Tuned Roadster Single-Cylinder',
    cooling: 'Air-Oil Cooled',
    powerBhp: 20.2,
    torqueNm: 27.0,
    topSpeedKmh: 126,
    accelerationScore: 6.6,
    handlingScore: 8.8,
    brakingScore: 8.2,
    accelRate: 18.0,
    steerRate: 9.0,
    brakeRate: 42,
    cockpit: {
      dashType: 'hunter-asymmetric',
      windshieldType: 'small-cowl',
      mirrorType: 'modern-roadster',
      handlebarType: 'flat-roadster',
      forkColor: 0x1e2024,
      primaryColor: 0x1d4ed8, // Rebel Blue
      accentColor: 0xe2e8f0,
    },
    sound: {
      id: 'hunter-350-sound',
      name: 'Hunter 350 Short-Exhaust Roadster Bark',
      idlePulseFreq: 11.0, // ~1320 RPM eager, punchy idle
      maxPulseFreq: 52, // ~6200 RPM
      subBassFreq: 42,
      subBassDepth: 0.75,
      filterIdle: 340,
      filterMax: 1900,
      mechanicalClatter: 0.22,
      gearWhine: 0.08,
      overrunPop: 0.45, // Snappy roadster exhaust crackles on overrun
      exhaustTone: 'raspy-roadster',
      exhaustDescription: 'Short upswept roadster silencer with raspy, urgent throttle response and snappy overrun pops.',
      disclaimer: 'Procedural acoustic physical model simulating Hunter 350 short-canister roadster acoustics (not an official factory field recording).',
    },
    description: 'Compact geometry with 17-inch cast alloy wheels, sharper rake angle, asymmetric digi-analog instruments with Tripper pod, and a snappy exhaust note.',
    modelLegalNote: 'Procedural 3D model approximation of Hunter 350 offset digi-analog console & roadster bars.',
  },
  {
    id: 'himalayan-411',
    name: 'Himalayan 411',
    series: 'Gen-1 Adventure',
    badge: 'LS410 AIR-COOLED TRACTOR TOURER',
    displacementCc: 411,
    engineType: 'LS410 Long-Stroke SOHC Single',
    cooling: 'Air-Oil Cooled',
    powerBhp: 24.3,
    torqueNm: 32.0,
    topSpeedKmh: 124,
    accelerationScore: 6.0,
    handlingScore: 7.5,
    brakingScore: 7.2,
    accelRate: 16.5,
    steerRate: 7.4,
    brakeRate: 38,
    cockpit: {
      dashType: 'himalayan-411-multi',
      windshieldType: 'tall-adv-411',
      mirrorType: 'adv-rugged',
      handlebarType: 'wide-adv',
      hasExoCage: true,
      forkColor: 0x27272a,
      primaryColor: 0x22242a, // Granite Black
      accentColor: 0x94a3b8,
    },
    sound: {
      id: 'himalayan-411-sound',
      name: 'Himalayan 411 LS410 Tractor Chug & Gear Whine',
      idlePulseFreq: 10.0, // ~1200 RPM steady tractor chug
      maxPulseFreq: 46, // ~5500 RPM
      subBassFreq: 38,
      subBassDepth: 0.88,
      filterIdle: 270,
      filterMax: 1550,
      mechanicalClatter: 0.45, // Mechanical clatter of LS410 SOHC
      gearWhine: 0.45, // Iconic straight-cut primary reduction gear whine!
      overrunPop: 0.22,
      exhaustTone: 'ls410-tractor-chug',
      exhaustDescription: 'Distinctive LS410 long-stroke tractor cadence accompanied by the signature straight-cut primary reduction gear whine.',
      disclaimer: 'Procedural acoustic physical model simulating LS410 engine and primary reduction gear acoustics (not an official factory field recording).',
    },
    description: 'The beloved Gen-1 adventure machine. Features the distinctive multi-dial analog/digital dash (speedo, tachometer, compass pod), external black steel subframe exo-cage, and tall vertical windscreen.',
    modelLegalNote: 'Procedural 3D model approximation of Himalayan 411 multi-pod analog dashboard, exo-cage, and windscreen.',
  },
  {
    id: 'himalayan-450',
    name: 'Himalayan 450',
    series: 'Gen-2 Modern Adventure',
    badge: 'SHERPA 452cc DOHC LIQUID-COOLED 40 BHP',
    displacementCc: 452,
    engineType: 'Sherpa 450 Liquid-Cooled DOHC 4-Valve Single',
    cooling: 'Liquid Cooled',
    powerBhp: 40.0,
    torqueNm: 40.0,
    topSpeedKmh: 152,
    accelerationScore: 8.6,
    handlingScore: 8.7,
    brakingScore: 8.9,
    accelRate: 23.0,
    steerRate: 8.4,
    brakeRate: 45,
    cockpit: {
      dashType: 'himalayan-450-tft',
      windshieldType: 'aero-adv-450',
      mirrorType: 'adv-rugged',
      handlebarType: 'wide-adv',
      hasExoCage: false,
      forkColor: 0xd4af37, // Gold USD Showa forks
      primaryColor: 0xf1f5f9, // Kamet White
      accentColor: 0xd97706,
    },
    sound: {
      id: 'himalayan-450-sound',
      name: 'Himalayan 450 Sherpa 452 DOHC Adventure Roar',
      idlePulseFreq: 12.0, // ~1440 RPM modern liquid-cooled idle
      maxPulseFreq: 70, // ~8400 RPM high-revving 4-valve DOHC!
      subBassFreq: 46,
      subBassDepth: 0.78,
      filterIdle: 380,
      filterMax: 2400,
      mechanicalClatter: 0.16, // Liquid jacket dampens mechanical noise
      gearWhine: 0.12,
      overrunPop: 0.28,
      exhaustTone: 'sherpa-dohc-adv',
      exhaustDescription: 'High-revving 40 BHP liquid-cooled DOHC 4-valve intake roar tuned through an adventure touring canister silencer.',
      disclaimer: 'Procedural acoustic physical model simulating 452cc Sherpa DOHC 4-valve liquid-cooled acoustics (not an official factory field recording).',
    },
    description: 'Next-generation all-road tourer powered by the high-revving 40 BHP Sherpa 450 liquid-cooled engine. Boasts a 4-inch full-color circular TripperDash TFT, inverted gold front forks, and aerodynamic adventure screen.',
    modelLegalNote: 'Procedural 3D model approximation of Himalayan 450 circular TFT TripperDash & USD adventure cockpit.',
  },
  {
    id: 'guerrilla-450',
    name: 'Guerrilla 450',
    series: 'Urban Scrambler Roadster',
    badge: 'SHERPA 452 STREET FIGHTER',
    displacementCc: 452,
    engineType: 'Sherpa 450 Liquid-Cooled DOHC 4-Valve Roadster',
    cooling: 'Liquid Cooled',
    powerBhp: 40.0,
    torqueNm: 40.0,
    topSpeedKmh: 156,
    accelerationScore: 9.1,
    handlingScore: 9.3,
    brakingScore: 9.0,
    accelRate: 25.0,
    steerRate: 9.0,
    brakeRate: 46,
    cockpit: {
      dashType: 'guerrilla-tft',
      windshieldType: 'none',
      mirrorType: 'modern-roadster',
      handlebarType: 'tracker-scrambler',
      hasExoCage: false,
      forkColor: 0x18181b,
      primaryColor: 0x0284c7, // Brava Blue
      accentColor: 0xfacc15, // Yellow ribbon
    },
    sound: {
      id: 'guerrilla-450-sound',
      name: 'Guerrilla 450 Aggressive Scrambler Bark & Crackle',
      idlePulseFreq: 12.8, // ~1530 RPM punchy scrambler idle
      maxPulseFreq: 75, // ~9000 RPM streetfighter redline
      subBassFreq: 48,
      subBassDepth: 0.76,
      filterIdle: 420,
      filterMax: 2600,
      mechanicalClatter: 0.18,
      gearWhine: 0.1,
      overrunPop: 0.65, // Aggressive deceleration pop and burble!
      exhaustTone: 'sherpa-scrambler-bark',
      exhaustDescription: 'Aggressive roadster-tuned short silencer on the 452cc Sherpa engine with urgent mid-range bark and loud overrun crackles.',
      disclaimer: 'High-fidelity procedural Web Audio physical simulation of Guerrilla 450 scrambler-tuned exhaust acoustics.',
    },
    description: 'Aggressive street scrambler built on the Sherpa 450 engine with 17-inch fat tires, low-rise tracker handlebars, naked front styling, and instant throttle response for carving city traffic.',
    modelLegalNote: 'Procedural 3D model approximation of Guerrilla 450 naked tracker cockpit & round TFT display.',
  },
];

export function getMotorcycleById(id: string): MotorcycleConfig {
  return MOTORCYCLE_REGISTRY.find((b) => b.id === id) || MOTORCYCLE_REGISTRY[0];
}
