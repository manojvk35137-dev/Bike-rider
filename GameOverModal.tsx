import React from 'react';
import { RotateCcw, Home, Trophy, Gauge, Flame, Compass } from 'lucide-react';
import { GameStats } from '../game/constants';
import { MotorcycleConfig } from '../game/motorcycles';

interface GameOverModalProps {
  stats: GameStats;
  highScore: number;
  isNewHigh: boolean;
  bike: MotorcycleConfig;
  onRestart: () => void;
  onReturnToGarage: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  highScore,
  isNewHigh,
  bike,
  onRestart,
  onReturnToGarage,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="max-w-md w-full hud-panel rounded-3xl p-6 text-white shadow-2xl border border-red-500/40 relative overflow-hidden">
        {/* Crash Top Header Banner */}
        <div className="text-center mb-4">
          <span className="px-3 py-1 rounded-full bg-red-600/30 border border-red-500 text-red-400 font-chakra font-black tracking-widest text-xs uppercase inline-block mb-1">
            CRASH DETECTED
          </span>
          <h2 className="font-chakra italic font-black text-3xl md:text-4xl text-white tracking-tight">
            RIDE OVER
          </h2>
          <p className="text-xs font-mono-num text-zinc-400 mt-0.5">
            {bike.name} · {bike.series}
          </p>
        </div>

        {/* New High Score celebration badge */}
        {isNewHigh && (
          <div className="mb-4 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-amber-500/30 border border-amber-400/60 text-center animate-pulse">
            <div className="flex items-center justify-center gap-1.5 text-amber-300 font-chakra font-black text-sm tracking-widest">
              <Trophy className="w-4 h-4" />
              <span>NEW HIGH SCORE!</span>
            </div>
          </div>
        )}

        {/* Total Score Readout */}
        <div className="hud-panel p-4 rounded-2xl text-center mb-4 border border-zinc-700/80">
          <span className="text-xs font-mono-num text-zinc-400 uppercase tracking-widest block">
            FINAL SCORE
          </span>
          <span className="font-chakra italic font-black text-4xl text-cyan-400 tracking-tight font-mono-num block my-1">
            {stats.score.toLocaleString()}
          </span>
          <span className="text-[11px] font-mono-num text-zinc-500">
            ALL-TIME BEST: {Math.max(highScore, stats.score).toLocaleString()}
          </span>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6 text-center font-mono-num">
          <div className="hud-panel p-2.5 rounded-xl">
            <Compass className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <span className="text-[10px] text-zinc-400 block">DISTANCE</span>
            <span className="font-bold text-sm text-white">
              {(stats.distanceMeters / 1000).toFixed(2)} km
            </span>
          </div>

          <div className="hud-panel p-2.5 rounded-xl">
            <Gauge className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[10px] text-zinc-400 block">SPEED</span>
            <span className="font-bold text-sm text-white">
              {stats.speedKmh} km/h
            </span>
          </div>

          <div className="hud-panel p-2.5 rounded-xl">
            <Flame className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <span className="text-[10px] text-zinc-400 block">CLOSE CALLS</span>
            <span className="font-bold text-sm text-white">
              {stats.closeCalls}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={onRestart}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-chakra font-black tracking-widest text-base shadow-[0_0_18px_rgba(0,229,255,0.4)] transition active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>RIDE AGAIN</span>
          </button>

          <button
            onClick={onReturnToGarage}
            className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-chakra font-bold tracking-wider text-sm transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>GARAGE / CHANGE MOTORCYCLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
