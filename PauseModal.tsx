import React, { useState } from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Sliders } from 'lucide-react';
import { MotorcycleConfig } from '../game/motorcycles';
import { sounds } from '../audio/SoundEffects';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnToGarage: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  bike: MotorcycleConfig;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnToGarage,
  isMuted,
  onToggleMute,
  bike,
}) => {
  const [engineVol, setEngineVol] = useState<number>(sounds.volumeSettings.engine);
  const [windVol, setWindVol] = useState<number>(sounds.volumeSettings.wind);

  const handleEngineVolChange = (val: number) => {
    setEngineVol(val);
    sounds.setVolumes(undefined, val, undefined, undefined);
  };

  const handleWindVolChange = (val: number) => {
    setWindVol(val);
    sounds.setVolumes(undefined, undefined, val, val);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="max-w-md w-full hud-panel rounded-3xl p-6 text-white shadow-2xl border border-zinc-700/80 text-center">
        <h2 className="font-chakra italic font-black text-3xl text-white tracking-tight mb-1">
          RIDE PAUSED
        </h2>
        <p className="text-xs font-mono-num text-cyan-400 mb-1">
          {bike.name} · {bike.engineType}
        </p>
        <p className="text-[11px] text-zinc-400 mb-5 italic">
          {bike.sound.exhaustDescription}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2.5 mb-6">
          <button
            onClick={onResume}
            className="w-full py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-chakra font-black tracking-widest text-base shadow-[0_0_15px_rgba(0,229,255,0.4)] transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-black" />
            <span>RESUME RIDE</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-chakra font-bold tracking-wider text-sm transition active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART</span>
          </button>

          <button
            onClick={onReturnToGarage}
            className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white font-chakra font-bold tracking-wider text-sm transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO GARAGE</span>
          </button>
        </div>

        {/* Audio Tuning Sliders */}
        <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 text-left mb-4">
          <div className="flex items-center justify-between mb-3 text-xs font-bold text-zinc-300 tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              AUDIO CONTROLS
            </span>
            <button
              onClick={onToggleMute}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white text-[11px]"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] font-mono-num text-zinc-400 mb-1">
                <span>ENGINE THUMP & EXHAUST</span>
                <span className="text-cyan-400">{Math.round(engineVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={engineVol}
                onChange={(e) => handleEngineVolChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono-num text-zinc-400 mb-1">
                <span>WIND & TRAFFIC NOISE</span>
                <span className="text-amber-400">{Math.round(windVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={windVol}
                onChange={(e) => handleWindVolChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 leading-tight">
          {bike.sound.disclaimer}
        </p>
      </div>
    </div>
  );
};
