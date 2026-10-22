
import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Gauge,
  Shield,
  Zap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

import { GameMode } from './constants';
import { MOTORCYCLE_REGISTRY, MotorcycleConfig } from './motorcycles';
import { MotorcycleViewer3D } from './MotorcycleViewer3D';
import { sounds } from './src/audio/SoundEffects';

interface StartScreenProps {
  onStartGame: (mode: GameMode, bike: MotorcycleConfig) => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  selectedBike: MotorcycleConfig;
  onSelectBike: (bike: MotorcycleConfig) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  highScore,
  isMuted,
  onToggleMute,
  selectedBike,
  onSelectBike,
}) => {
  const [mode, setMode] = useState<GameMode>('one-way');
  const [isPlayingAudioPreview, setIsPlayingAudioPreview] = useState(false);

  const currentIndex = MOTORCYCLE_REGISTRY.findIndex(
    (bike) => bike.id === selectedBike.id
  );

  const handlePrevBike = () => {
    const nextIdx =
      (currentIndex - 1 + MOTORCYCLE_REGISTRY.length) %
      MOTORCYCLE_REGISTRY.length;

    const bike = MOTORCYCLE_REGISTRY[nextIdx];
    if (!bike) return;

    onSelectBike(bike);
    sounds.setProfile(bike.sound);
  };

  const handleNextBike = () => {
    const nextIdx = (currentIndex + 1) % MOTORCYCLE_REGISTRY.length;
    const bike = MOTORCYCLE_REGISTRY[nextIdx];
    if (!bike) return;

    onSelectBike(bike);
    sounds.setProfile(bike.sound);
  };

  const handleSoundPreview = () => {
    if (isPlayingAudioPreview) return;

    sounds.init();
    sounds.resume();
    sounds.setProfile(selectedBike.sound);
    setIsPlayingAudioPreview(true);

    sounds.updateEngine(35, 0.65, true, false);

    setTimeout(() => {
      sounds.updateEngine(0, 0.25, false, false);

      setTimeout(() => {
        sounds.stopAll();
        setIsPlayingAudioPreview(false);
      }, 700);
    }, 600);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-3 md:p-6 bg-zinc-950/85 backdrop-blur-md text-white overflow-y-auto">
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <div className="flex items-center space-x-3">
          <svg
            className="w-10 h-10 text-cyan-400"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <path d="M8 36L16 12H24L18 36H8Z" fill="currentColor" />
            <path d="M22 36L30 12H38L32 36H22Z" fill="#d4af37" />
            <circle cx="34" cy="34" r="7" stroke="currentColor" strokeWidth="3" />
            <circle cx="14" cy="34" r="7" stroke="#d4af37" strokeWidth="3" />
          </svg>

          <div>
            <h1 className="font-chakra italic font-black text-2xl md:text-3xl tracking-tight text-white uppercase flex items-center gap-2">
              Moto Rider
              <span className="text-cyan-400 text-lg md:text-xl font-normal">
                Highway Rush
              </span>
            </h1>
            <p className="text-[11px] font-mono-num text-zinc-400">
              ROYAL ENFIELD EDITION · {MOTORCYCLE_REGISTRY.length} MOTORCYCLES
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hud-panel px-3 py-1.5 rounded-lg text-right font-mono-num">
            <span className="text-[10px] text-zinc-500 block uppercase">
              High Score
            </span>
            <span className="text-cyan-400 font-bold text-base md:text-lg">
              {highScore.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onToggleMute}
            className="hud-panel p-2.5 rounded-lg text-zinc-300 hover:text-white transition active:scale-95"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5 text-cyan-400" />
            )}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full my-auto py-2 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-4 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs font-mono-num text-zinc-400 px-1">
            <span>
              SELECT MOTORCYCLE ({Math.max(0, currentIndex + 1)}/
              {MOTORCYCLE_REGISTRY.length})
            </span>

            <div className="flex space-x-1">
              <button
                onClick={handlePrevBike}
                disabled={MOTORCYCLE_REGISTRY.length < 2}
                aria-label="Previous motorcycle"
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition active:scale-90 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleNextBike}
                disabled={MOTORCYCLE_REGISTRY.length < 2}
                aria-label="Next motorcycle"
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition active:scale-90 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 pb-2 lg:pb-0 scrollbar-none">
            {MOTORCYCLE_REGISTRY.map((bike) => {
              const isSelected = bike.id === selectedBike.id;

              return (
                <button
                  key={bike.id}
                  onClick={() => {
                    onSelectBike(bike);
                    sounds.setProfile(bike.sound);
                  }}
                  className={`text-left p-2.5 rounded-xl border transition flex-shrink-0 lg:flex-shrink w-48 lg:w-full ${
                    isSelected
                      ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-chakra font-bold text-sm text-white tracking-wide">
                      {bike.name}
                    </span>
                    <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 whitespace-nowrap">
                      {bike.displacementCc}cc
                    </span>
                  </div>

                  <span className="text-[10px] text-zinc-400 block mt-0.5 truncate">
                    {bike.series}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 h-64 md:h-84 relative rounded-2xl overflow-hidden hud-panel flex items-center justify-center">
          <MotorcycleViewer3D bike={selectedBike} />

          <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/70 border border-zinc-700 text-[11px] font-mono-num font-bold text-cyan-300">
            {selectedBike.badge}
          </div>

          <button
            onClick={handleSoundPreview}
            disabled={isPlayingAudioPreview}
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 hover:border-cyan-400 text-xs font-mono-num flex items-center gap-1.5 text-zinc-200 transition active:scale-95 disabled:opacity-60"
          >
            <Volume2
              className={`w-3.5 h-3.5 ${
                isPlayingAudioPreview
                  ? 'text-amber-400 animate-pulse'
                  : 'text-cyan-400'
              }`}
            />
            <span>
              {isPlayingAudioPreview ? 'REV SOUND...' : 'TEST EXHAUST'}
            </span>
          </button>
        </div>

        <div className="lg:col-span-3 hud-panel p-4 rounded-2xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <h2 className="font-chakra font-bold text-lg text-white">
                {selectedBike.name}
              </h2>
              <span className="text-xs font-mono-num text-cyan-400 font-bold">
                {selectedBike.engineType.split(' ')[0]}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
              {selectedBike.description}
            </p>
          </div>

          <div className="space-y-2 text-xs font-mono-num">
            <div>
              <div className="flex justify-between text-zinc-400 text-[11px] mb-0.5">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  TOP SPEED
                </span>
                <span className="text-white font-bold">
                  {selectedBike.topSpeedKmh} KM/H
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (selectedBike.topSpeedKmh / 160) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-zinc-400 text-[11px] mb-0.5">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  ACCELERATION
                </span>
                <span className="text-white font-bold">
                  {selectedBike.powerBhp} BHP ({selectedBike.accelerationScore}/10)
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, selectedBike.accelerationScore * 10)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-zinc-400 text-[11px] mb-0.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  HANDLING
                </span>
                <span className="text-white font-bold">
                  {selectedBike.handlingScore}/10
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, selectedBike.handlingScore * 10)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-zinc-400 text-[11px] mb-0.5">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  BRAKES
                </span>
                <span className="text-white font-bold">
                  {selectedBike.brakingScore}/10
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-400 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, selectedBike.brakingScore * 10)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono-num flex justify-between gap-2 text-zinc-300">
            <span>{selectedBike.cooling}</span>
            <span className="text-amber-400 whitespace-nowrap">
              {selectedBike.torqueNm} Nm Torque
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full pt-2 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-zinc-800/80">
        <div className="flex items-center space-x-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setMode('one-way')}
            className={`px-3 py-1.5 rounded-lg text-xs font-chakra font-bold tracking-wider transition ${
              mode === 'one-way'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ONE-WAY
          </button>

          <button
            onClick={() => setMode('two-way')}
            className={`px-3 py-1.5 rounded-lg text-xs font-chakra font-bold tracking-wider transition ${
              mode === 'two-way'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            TWO-WAY (DANGER)
          </button>

          <button
            onClick={() => setMode('time-rush')}
            className={`px-3 py-1.5 rounded-lg text-xs font-chakra font-bold tracking-wider transition ${
              mode === 'time-rush'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            TIME RUSH
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono-num max-w-md text-center md:text-left">
          <Info className="w-4 h-4 flex-shrink-0 text-zinc-400" />
          <span>
            {selectedBike.modelLegalNote} Acoustic simulation synthesized
            procedurally with Web Audio API.
          </span>
        </div>

        <button
          onClick={() => {
            sounds.init();
            sounds.resume();
            onStartGame(mode, selectedBike);
          }}
          className="w-full md:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-chakra font-black tracking-widest text-lg md:text-xl shadow-[0_0_24px_rgba(0,229,255,0.5)] transition active:scale-95 flex items-center justify-center gap-2"
        >
          <Play className="w-6 h-6 fill-black" />
          <span>RIDE {selectedBike.name.toUpperCase()}</span>
        </button>
      </div>
    </div>
  );
};
