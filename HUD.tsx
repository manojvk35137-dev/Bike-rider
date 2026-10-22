import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Pause, Flame, Volume1, ArrowLeft, ArrowRight } from 'lucide-react';
import { GameMode, GameStats } from '../game/constants';
import { InputState } from '../game/GameEngine';

interface HUDProps {
  stats: GameStats;
  inputs: InputState;
  onPause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  mode: GameMode;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  inputs,
  onPause,
  isMuted,
  onToggleMute,
  mode,
}) => {
  const [closeCallBanner, setCloseCallBanner] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => {
    if (stats.lastCloseCallText) {
      setCloseCallBanner({
        text: stats.lastCloseCallText,
        id: Date.now(),
      });
      const timer = setTimeout(() => {
        setCloseCallBanner(null);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [stats.lastCloseCallText, stats.lastCloseCallPoints]);

  const speedKmh = stats.speedKmh;
  const isHighSpeed = speedKmh > 140;

  // Touch handlers for mobile buttons
  const bindTouch = (field: keyof InputState) => ({
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      inputs[field] = true;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      inputs[field] = false;
    },
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      inputs[field] = true;
    },
    onMouseUp: (e: React.MouseEvent) => {
      e.preventDefault();
      inputs[field] = false;
    },
    onMouseLeave: () => {
      inputs[field] = false;
    },
  });

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-3 md:p-6 overflow-hidden">
      {/* High-speed wind vignette effect */}
      {isHighSpeed && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at center, transparent 55%, rgba(0, 229, 255, ${Math.min(
              0.22,
              (speedKmh - 140) / 280
            )}) 100%)`,
          }}
        />
      )}

      {/* Top Status Perimeter Clusters */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Digital Speedometer & Distance */}
        <div className="hud-panel rounded-xl p-3 md:p-4 text-white shadow-lg pointer-events-auto">
          <div className="flex items-baseline space-x-2">
            <span className="font-chakra italic font-black text-3xl md:text-5xl text-cyan-400 tracking-tight font-mono-num">
              {stats.speedKmh}
            </span>
            <span className="text-xs md:text-sm font-bold text-zinc-400 tracking-widest">
              KM/H
            </span>
            <div className="ml-3 px-2 py-0.5 rounded bg-zinc-800/90 border border-zinc-700 text-amber-400 font-mono-num font-bold text-xs md:text-sm">
              GEAR {stats.gear}
            </div>
          </div>

          <div className="flex items-center space-x-4 mt-1 text-xs md:text-sm font-mono-num text-zinc-300">
            <div>
              <span className="text-zinc-500 font-semibold mr-1">DIST:</span>
              <span className="text-white font-bold">{(stats.distanceMeters / 1000).toFixed(2)} km</span>
            </div>
            <div>
              <span className="text-zinc-500 font-semibold mr-1">SCORE:</span>
              <span className="text-cyan-300 font-bold">{stats.score.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Top-Center: Close Call / Near Miss Combo Notification */}
        {closeCallBanner && (
          <div className="pointer-events-none animate-bounce flex flex-col items-center">
            <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 text-white font-chakra font-black tracking-widest text-sm md:text-lg shadow-xl border border-yellow-300/60 uppercase">
              {closeCallBanner.text}
            </div>
            {stats.combo > 1 && (
              <span className="text-xs font-mono-num font-bold text-amber-300 mt-0.5 tracking-wider">
                COMBO x{stats.combo}!
              </span>
            )}
          </div>
        )}

        {/* Top-Right: Game Mode, Timer, Sound & Pause Buttons */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          {mode === 'time-rush' && (
            <div className="hud-panel rounded-lg px-3 py-1.5 font-mono-num font-black text-sm md:text-base border border-amber-500/40 text-amber-400">
              TIME: {stats.timeLeft}s
            </div>
          )}

          <button
            onClick={onToggleMute}
            className="hud-panel p-2.5 rounded-lg text-zinc-300 hover:text-white transition active:scale-95"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>

          <button
            onClick={onPause}
            className="hud-panel p-2.5 rounded-lg text-zinc-300 hover:text-white transition active:scale-95"
            title="Pause Game"
          >
            <Pause className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Center Subtle Crosshair / Vanishing guide (Optional Traffic Rider feel) */}
      <div className="flex-1" />

      {/* Bottom Controls Bar (Mobile Touch Controls & Desktop Keyboard Hints) */}
      <div className="w-full flex items-end justify-between pointer-events-none pb-1">
        {/* Left Side: Steering Controls & Horn */}
        <div className="flex flex-col space-y-2 pointer-events-auto">
          <div className="flex items-center space-x-2">
            <button
              {...bindTouch('steerLeft')}
              className={`touch-btn w-16 h-16 md:w-20 md:h-20 rounded-2xl flex flex-col items-center justify-center font-black transition active:scale-90 border ${
                inputs.steerLeft
                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.6)]'
                  : 'bg-zinc-900/80 text-white border-zinc-700/80 hover:bg-zinc-800'
              }`}
            >
              <ArrowLeft className="w-7 h-7" />
              <span className="text-[10px] tracking-wider opacity-70">STEER L</span>
            </button>

            <button
              {...bindTouch('steerRight')}
              className={`touch-btn w-16 h-16 md:w-20 md:h-20 rounded-2xl flex flex-col items-center justify-center font-black transition active:scale-90 border ${
                inputs.steerRight
                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.6)]'
                  : 'bg-zinc-900/80 text-white border-zinc-700/80 hover:bg-zinc-800'
              }`}
            >
              <ArrowRight className="w-7 h-7" />
              <span className="text-[10px] tracking-wider opacity-70">STEER R</span>
            </button>
          </div>

          {/* Horn button */}
          <button
            {...bindTouch('horn')}
            className={`touch-btn w-12 h-12 rounded-xl flex items-center justify-center transition active:scale-90 border ${
              inputs.horn
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-zinc-900/80 text-zinc-300 border-zinc-700 hover:text-white'
            }`}
            title="Honk Horn [H]"
          >
            <Volume1 className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Keyboard Controls Legend (hidden on small touch screens) */}
        <div className="hidden lg:flex flex-col items-center hud-panel px-4 py-1.5 rounded-lg text-[11px] font-mono-num text-zinc-400">
          <span>[W / ↑] Throttle · [S / ↓] Brake · [A / D / ← / →] Steer · [SPACE] Boost · [H] Horn</span>
        </div>

        {/* Right Side: Throttle, Brake & Boost */}
        <div className="flex items-end space-x-2 pointer-events-auto">
          {/* Boost / Nitro Button */}
          <button
            {...bindTouch('boost')}
            className={`touch-btn w-14 h-14 md:w-16 md:h-16 rounded-2xl flex flex-col items-center justify-center font-black transition active:scale-90 border ${
              inputs.boost
                ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.8)]'
                : 'bg-zinc-900/80 text-amber-400 border-amber-600/50 hover:bg-zinc-800'
            }`}
            title="Nitrous Boost [Space]"
          >
            <Flame className="w-6 h-6" />
            <span className="text-[9px] tracking-wider font-bold">NITRO</span>
          </button>

          {/* Brake Handle (Red) */}
          <button
            {...bindTouch('brake')}
            className={`touch-btn w-16 h-18 md:w-20 md:h-22 rounded-2xl flex flex-col items-center justify-center font-black transition active:scale-90 border ${
              inputs.brake
                ? 'bg-red-600 text-white border-red-400 shadow-[0_0_18px_rgba(220,38,38,0.8)]'
                : 'bg-red-950/70 text-red-400 border-red-800/80 hover:bg-red-900/60'
            }`}
          >
            <span className="text-sm md:text-base font-chakra tracking-wider">BRAKE</span>
            <span className="text-[10px] text-red-300/80 mt-1">[S]</span>
          </button>

          {/* Throttle Handle (Green / Cyan) */}
          <button
            {...bindTouch('throttle')}
            className={`touch-btn w-18 h-22 md:w-22 md:h-26 rounded-2xl flex flex-col items-center justify-center font-black transition active:scale-90 border ${
              inputs.throttle
                ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.8)]'
                : 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80 hover:bg-emerald-900/60'
            }`}
          >
            <span className="text-base md:text-lg font-chakra tracking-wider">GAS</span>
            <span className="text-[10px] text-emerald-300/80 mt-1">[W]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
