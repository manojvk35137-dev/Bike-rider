
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

  const selectBike = (bike: MotorcycleConfig) => {
    onSelectBike(bike);
    sounds.setProfile(bike.sound);
  };

  const handlePrevBike = () => {
    const nextIdx =
      (currentIndex - 1 + MOTORCYCLE_REGISTRY.length) %
      MOTORCYCLE_REGISTRY.length;

    const bike = MOTORCYCLE_REGISTRY[nextIdx];
    if (bike) selectBike(bike);
  };

  const handleNextBike = () => {
    const nextIdx = (currentIndex + 1) % MOTORCYCLE_REGISTRY.length;
    const bike = MOTORCYCLE_REGISTRY[nextIdx];
    if (bike) selectBike(bike);
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

  const startGame = () => {
    sounds.init();
    sounds.resume();
    onStartGame(mode, selectedBike);
  };

  return (
    <>
      <style>{`
        .garage-screen {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 12px;
          overflow-y: auto;
          background: rgba(9, 9, 11, 0.88);
          backdrop-filter: blur(12px);
          color: white;
        }

        .garage-header {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .garage-main {
          width: 100%;
          max-width: 1200px;
          margin: auto;
          padding: 12px 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          align-items: center;
        }

        .garage-bike-list {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding-bottom: 5px;
        }

        .garage-bike-card {
          flex-shrink: 0;
          width: 190px;
        }

        .garage-viewer {
          height: 280px;
          min-height: 0;
          position: relative;
          overflow: hidden;
        }

        .garage-details {
          min-width: 0;
        }

        .garage-footer {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding-top: 10px;
          border-top: 1px solid rgba(63, 63, 70, 0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .garage-mode-buttons {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 4px;
        }

        .garage-ride-button {
          width: 100%;
        }

        @media (orientation: landscape) and (min-width: 600px) {
          .garage-screen {
            padding: 7px 12px;
            overflow: hidden;
            gap: 5px;
          }

          .garage-header {
            height: 43px;
            min-height: 43px;
          }

          .garage-logo {
            width: 30px;
            height: 30px;
          }

          .garage-title {
            font-size: 20px !important;
            line-height: 22px;
          }

          .garage-subtitle {
            font-size: 8px !important;
          }

          .garage-header-actions {
            gap: 7px !important;
          }

          .garage-score {
            padding: 3px 8px !important;
          }

          .garage-main {
            flex: 1;
            min-height: 0;
            padding: 3px 0;
            grid-template-columns: minmax(145px, 19%) minmax(0, 1fr) minmax(190px, 24%);
            gap: 9px;
          }

          .garage-left {
            min-width: 0;
            height: 100%;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .garage-bike-list {
            flex: 1;
            min-height: 0;
            overflow-x: hidden;
            overflow-y: auto;
            flex-direction: column;
            padding: 3px;
          }

          .garage-bike-card {
            width: 100%;
            padding: 7px !important;
          }

          .garage-bike-card-name {
            font-size: 12px !important;
          }

          .garage-bike-card-series {
            font-size: 9px !important;
          }

          .garage-viewer {
            height: 100%;
            min-height: 0;
            border-radius: 13px;
          }

          .garage-details {
            height: 100%;
            min-height: 0;
            overflow-y: auto;
            padding: 9px !important;
            gap: 7px !important;
          }

          .garage-description {
            font-size: 9px !important;
            line-height: 1.35 !important;
            margin-top: 5px !important;
          }

          .garage-stats {
            gap: 6px !important;
          }

          .garage-stat-label {
            font-size: 9px !important;
          }

          .garage-stat-bar {
            height: 4px !important;
          }

          .garage-cooling {
            padding: 6px !important;
            font-size: 9px !important;
          }

          .garage-footer {
            min-height: 43px;
            padding-top: 5px;
            flex-direction: row;
            justify-content: space-between;
            gap: 8px;
          }

          .garage-mode-buttons {
            flex-wrap: nowrap;
            flex-shrink: 0;
          }

          .garage-mode-button {
            padding: 7px 9px !important;
            font-size: 10px !important;
            white-space: nowrap;
          }

          .garage-info {
            flex: 1;
            min-width: 0;
            font-size: 8px !important;
            text-align: center;
          }

          .garage-ride-button {
            width: auto;
            flex-shrink: 0;
            padding: 9px 15px !important;
            font-size: 14px !important;
            white-space: nowrap;
          }
        }

        @media (orientation: landscape) and (min-width: 600px) and (max-height: 430px) {
          .garage-screen {
            padding: 5px 9px;
          }

          .garage-header {
            height: 36px;
            min-height: 36px;
          }

          .garage-main {
            gap: 7px;
          }

          .garage-footer {
            min-height: 38px;
            padding-top: 4px;
          }

          .garage-bike-card {
            padding: 5px !important;
          }

          .garage-details {
            padding: 7px !important;
          }

          .garage-mode-button {
            padding: 6px 7px !important;
          }

          .garage-ride-button {
            padding: 7px 12px !important;
          }
        }
      `}</style>

      <div className="garage-screen">
        {/* HEADER */}
        <div className="garage-header">
          <div className="flex items-center gap-2 min-w-0">
            <svg
              className="garage-logo w-10 h-10 text-cyan-400 flex-shrink-0"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
            >
              <path d="M8 36L16 12H24L18 36H8Z" fill="currentColor" />
              <path d="M22 36L30 12H38L32 36H22Z" fill="#d4af37" />
              <circle cx="34" cy="34" r="7" stroke="currentColor" strokeWidth="3" />
              <circle cx="14" cy="34" r="7" stroke="#d4af37" strokeWidth="3" />
            </svg>

            <div className="min-w-0">
              <h1 className="garage-title font-chakra italic font-black text-2xl md:text-3xl tracking-tight text-white uppercase flex items-center gap-2 whitespace-nowrap">
                Moto Rider
                <span className="text-cyan-400 text-lg md:text-xl font-normal">
                  Highway Rush
                </span>
              </h1>

              <p className="garage-subtitle text-[11px] font-mono-num text-zinc-400">
                ROYAL ENFIELD EDITION · {MOTORCYCLE_REGISTRY.length} MOTORCYCLES
              </p>
            </div>
          </div>

          <div className="garage-header-actions flex items-center gap-3 flex-shrink-0">
            <div className="garage-score hud-panel px-3 py-1.5 rounded-lg text-right font-mono-num">
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

        {/* MAIN GARAGE */}
        <div className="garage-main">
          {/* LEFT: BIKE SELECTION */}
          <div className="garage-left flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-num text-zinc-400 px-1 flex-shrink-0">
              <span className="text-[10px]">
                SELECT BIKE ({Math.max(0, currentIndex + 1)}/{MOTORCYCLE_REGISTRY.length})
              </span>

              <div className="flex gap-1">
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

            <div className="garage-bike-list scrollbar-none">
              {MOTORCYCLE_REGISTRY.map((bike) => {
                const isSelected = bike.id === selectedBike.id;

                return (
                  <button
                    key={bike.id}
                    onClick={() => selectBike(bike)}
                    className={`garage-bike-card text-left p-2.5 rounded-xl border transition ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                        : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="garage-bike-card-name font-chakra font-bold text-sm text-white tracking-wide truncate">
                        {bike.name}
                      </span>

                      <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 whitespace-nowrap">
                        {bike.displacementCc}cc
                      </span>
                    </div>

                    <span className="garage-bike-card-series text-[10px] text-zinc-400 block mt-0.5 truncate">
                      {bike.series}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CENTER: 3D BIKE VIEWER */}
          <div className="garage-viewer rounded-2xl hud-panel flex items-center justify-center">
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

          {/* RIGHT: BIKE DETAILS */}
          <div className="garage-details hud-panel p-4 rounded-2xl flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                <h2 className="font-chakra font-bold text-lg text-white truncate">
                  {selectedBike.name}
                </h2>

                <span className="text-xs font-mono-num text-cyan-400 font-bold whitespace-nowrap">
                  {selectedBike.engineType.split(' ')[0]}
                </span>
              </div>

              <p className="garage-description text-[11px] text-zinc-400 mt-2 leading-relaxed">
                {selectedBike.description}
              </p>
            </div>

            <div className="garage-stats space-y-2 text-xs font-mono-num">
              <div>
                <div className="flex justify-between text-zinc-400 text-[11px] mb-0.5">
                  <span className="flex items-center gap-1 garage-stat-label">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    TOP SPEED
                  </span>
                  <span className="text-white font-bold">
                    {selectedBike.topSpeedKmh} KM/H
                  </span>
                </div>
                <div className="garage-stat-bar w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
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
                  <span className="flex items-center gap-1 garage-stat-label">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    ACCELERATION
                  </span>
                  <span className="text-white font-bold">
                    {selectedBike.powerBhp} BHP ({selectedBike.accelerationScore}/10)
                  </span>
                </div>
                <div className="garage-stat-bar w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
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
                  <span className="flex items-center gap-1 garage-stat-label">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    HANDLING
                  </span>
                  <span className="text-white font-bold">
                    {selectedBike.handlingScore}/10
                  </span>
                </div>
                <div className="garage-stat-bar w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
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
                  <span className="flex items-center gap-1 garage-stat-label">
                    <Shield className="w-3.5 h-3.5 text-rose-400" />
                    BRAKES
                  </span>
                  <span className="text-white font-bold">
                    {selectedBike.brakingScore}/10
                  </span>
                </div>
                <div className="garage-stat-bar w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-400 h-full rounded-full"
                    style={{
                      width: `${Math.min(100, selectedBike.brakingScore * 10)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="garage-cooling p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono-num flex justify-between gap-2 text-zinc-300">
              <span className="truncate">{selectedBike.cooling}</span>
              <span className="text-amber-400 whitespace-nowrap">
                {selectedBike.torqueNm} Nm Torque
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="garage-footer">
          <div className="garage-mode-buttons bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setMode('one-way')}
              className={`garage-mode-button px-3 py-1.5 rounded-lg text-xs font-chakra font-bold tracking-wider transition ${
                mode === 'one-way'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ONE-WAY
            </button>

            <button
              onClick={() => setMode('two-way')}
              className={`garage-mode-button px-3 py-1.5 rounded-lg text-xs font-chakra font-bold tracking-wider transition ${
                mode === 'two-way'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              TWO-WAY (DANGER)
            </button>

            <button
              onClick={() => setMode('time-rush')}
              className={`garage-mode-button px-3 py-1.5 rounded-lg text-xs font-chakra font-bold tracking-wider transition ${
                mode === 'time-rush'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              TIME RUSH
            </button>
          </div>

          <div className="garage-info flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono-num max-w-md text-center">
            <Info className="w-4 h-4 flex-shrink-0 text-zinc-400" />
            <span>
              {selectedBike.modelLegalNote} Acoustic simulation synthesized
              procedurally with Web Audio API.
            </span>
          </div>

          <button
            onClick={startGame}
            className="garage-ride-button px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-chakra font-black tracking-widest text-lg md:text-xl shadow-[0_0_24px_rgba(0,229,255,0.5)] transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-6 h-6 fill-black" />
            <span>RIDE {selectedBike.name.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </>
  );
};
