export const GAME_CONSTANTS = {
  // Highway Geometry
  LANE_WIDTH: 3.8,
  LANES_COUNT: 4,
  HIGHWAY_WIDTH: 16.5,
  GUARDRAIL_OFFSET: 8.6,
  SEGMENT_LENGTH: 80,
  ACTIVE_SEGMENTS: 10, // Total visual highway length 800m for deep realistic horizon
  FOG_NEAR: 260,
  FOG_FAR: 760,

  // Lanes X coordinates: [-5.7, -1.9, 1.9, 5.7]
  LANE_CENTERS: [-5.7, -1.9, 1.9, 5.7],

  // Player Motorcycle Physics
  MIN_SPEED_KMH: 0,
  MAX_SPEED_KMH: 215,
  BOOST_SPEED_KMH: 245,
  ACCELERATION: 42, // km/h per second
  BRAKE_POWER: 85, // km/h per second
  IDLE_DECELERATION: 16, // engine braking
  STEER_SPEED: 8.5, // lateral meters per second
  MAX_LEAN_ANGLE: 0.28, // radians (~16 degrees)
  CAMERA_HEIGHT: 1.22, // rider seated eye level
  CAMERA_Z: 0.0, // rider head position
  CAMERA_BASE_PITCH: -0.06, // natural downward angle towards road and instruments

  // Collision and Close Call
  PLAYER_BOUNDS: {
    width: 0.8,
    length: 2.0,
  },
  CLOSE_CALL_MAX_DIST: 1.68, // center-to-center lateral distance for near-miss
  CLOSE_CALL_MIN_SPEED_KMH: 95,
  CLOSE_CALL_BONUS_SCORE: 350,

  // Traffic
  SPAWN_AHEAD_DISTANCE: 320,
  DESPAWN_BEHIND_DISTANCE: 40,
  MAX_TRAFFIC_COUNT: 14,
};

export type GameMode = 'one-way' | 'two-way' | 'time-rush';

export interface GameStats {
  speedKmh: number;
  rpmNorm: number;
  gear: number;
  distanceMeters: number;
  score: number;
  closeCalls: number;
  combo: number;
  timeLeft: number; // for time-rush
  gameOver: boolean;
  gameStarted: boolean;
  isPaused: boolean;
  lastCloseCallText: string | null;
  lastCloseCallPoints: number;
}
