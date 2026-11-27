import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2, VolumeX, Play, Gauge, Shield, Zap, Sparkles,
  ChevronLeft, ChevronRight, Info, Settings, X, RotateCcw,
  Eye, EyeOff, Move, Minus, Plus
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
  onOpenFriends?: () => void;
  onOpenMultiplayer?: () => void;
  isMultiplayerOpen?: boolean;
  onSongControlVisibilityChange?: (visible: boolean) => void;
}

type ItemId =
  | 'bikeList' | 'viewer' | 'details' | 'exhaust' | 'modes'
  | 'ride' | 'mute' | 'friends' | 'multiplayer'
  | 'songControl' | 'settings';

type ItemLayout = {
  x: number;
  y: number;
  scale: number;
  visible: boolean;
};

type LayoutMap = Record<ItemId, ItemLayout>;

const DEFAULT_LAYOUT: LayoutMap = {
  bikeList: { x: 0, y: 0, scale: 1, visible: true },
  viewer: { x: 0, y: 0, scale: 1, visible: true },
  details: { x: 0, y: 0, scale: 1, visible: true },
  exhaust: { x: 0, y: 0, scale: 1, visible: true },
  modes: { x: 0, y: 0, scale: 1, visible: true },
  ride: { x: 0, y: 0, scale: 1, visible: true },
  mute: { x: 0, y: 0, scale: 1, visible: true },
  friends: { x: 0, y: 0, scale: 1, visible: true },
  multiplayer: { x: 0, y: 0, scale: 1, visible: true },
  songControl: { x: 0, y: 0, scale: 1, visible: true },
  settings: { x: 0, y: 0, scale: 1, visible: true },
};

const LAYOUT_KEY = 'bike_rider_garage_layout_v2';
const SETTINGS_KEY = 'bike_rider_garage_settings';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function readLayout(): LayoutMap {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return { ...DEFAULT_LAYOUT };

    const parsed = JSON.parse(raw);
    const result = { ...DEFAULT_LAYOUT } as LayoutMap;

    (Object.keys(DEFAULT_LAYOUT) as ItemId[]).forEach((id) => {
      const value = parsed?.[id];

      if (value) {
        result[id] = {
          x: Number.isFinite(value.x) ? clamp(value.x, -30, 30) : 0,
          y: Number.isFinite(value.y) ? clamp(value.y, -28, 28) : 0,
          scale: Number.isFinite(value.scale) ? clamp(value.scale, 0.65, 1.5) : 1,
          visible:
            id === 'settings'
              ? true
              : typeof value.visible === 'boolean'
                ? value.visible
                : true,
        };
      }
    });

    result.settings.visible = true;
    return result;
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

const LABELS: Record<ItemId, string> = {
  bikeList: 'Bike List',
  viewer: '3D Viewer',
  details: 'Bike Details',
  exhaust: 'Test Exhaust',
  modes: 'Game Mode Buttons',
  ride: 'Ride Button',
  mute: 'Mute Button',
  friends: 'Friends Button',
  multiplayer: 'Multiplayer Button',
  songControl: 'Song Control',
  settings: 'Settings Button',
};

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  highScore,
  isMuted,
  onToggleMute,
  selectedBike,
  onSelectBike,
  onOpenFriends,
  onOpenMultiplayer,
  isMultiplayerOpen = false,
  onSongControlVisibilityChange,
}) => {
  const [mode, setMode] = useState<GameMode>('one-way');
  const [isPlayingAudioPreview, setIsPlayingAudioPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editLayout, setEditLayout] = useState(false);
  const [layout, setLayout] = useState<LayoutMap>(readLayout);

  const [buttonSize, setButtonSize] = useState<'small' | 'medium' | 'large'>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? JSON.parse(saved).size || 'medium' : 'medium';
    } catch {
      return 'medium';
    }
  });

  const dragRef = useRef<{
    id: ItemId;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const currentIndex = Math.max(
    0,
    MOTORCYCLE_REGISTRY.findIndex((bike) => bike.id === selectedBike.id)
  );

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch {
      // Local storage may be unavailable.
    }
  }, [layout]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ size: buttonSize }));
    } catch {
      // Local storage may be unavailable.
    }
  }, [buttonSize]);

  // Keep App.tsx music panel visibility synchronized with saved layout.
  useEffect(() => {
    onSongControlVisibilityChange?.(layout.songControl.visible);
  }, [layout.songControl.visible, onSongControlVisibilityChange]);

  useEffect(() => {
    if (!editLayout) {
      dragRef.current = null;
      return;
    }

    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const dx = ((event.clientX - drag.startX) / width) * 100;
      const dy = ((event.clientY - drag.startY) / height) * 100;

      setLayout((old) => ({
        ...old,
        [drag.id]: {
          ...old[drag.id],
          x: clamp(drag.baseX + dx, -30, 30),
          y: clamp(drag.baseY + dy, -28, 28),
        },
      }));
    };

    const up = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [editLayout]);

  const updateItem = (id: ItemId, patch: Partial<ItemLayout>) => {
    setLayout((old) => ({
      ...old,
      [id]: {
        ...old[id],
        ...patch,
        ...(id === 'settings' ? { visible: true } : {}),
      },
    }));
  };

  const itemStyle = (id: ItemId): React.CSSProperties => ({
    position: 'relative',
    transform: `translate3d(${layout[id].x}vw, ${layout[id].y}vh, 0) scale(${layout[id].scale})`,
    transformOrigin: 'center center',
    display: id === 'settings' ? 'block' : layout[id].visible ? undefined : 'none',
    zIndex: editLayout ? 30 : undefined,
    willChange: editLayout ? 'transform' : undefined,
  });

  const dragHandle = (id: ItemId) =>
    editLayout ? (
      <button
        type="button"
        aria-label={`Drag ${LABELS[id]}`}
        title="Drag to move"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          dragRef.current = {
            id,
            startX: event.clientX,
            startY: event.clientY,
            baseX: layout[id].x,
            baseY: layout[id].y,
          };
        }}
        className="absolute -top-3 -left-2 z-[80] flex h-8 w-8 touch-none items-center justify-center rounded-full border border-cyan-300 bg-cyan-600 text-white shadow-lg"
        style={{ touchAction: 'none' }}
      >
        <Move className="h-4 w-4" />
      </button>
    ) : null;

  const selectBike = (bike: MotorcycleConfig) => {
    onSelectBike(bike);
    sounds.setProfile(bike.sound);
  };

  const changeBike = (direction: number) => {
    const next =
      (currentIndex + direction + MOTORCYCLE_REGISTRY.length) %
      MOTORCYCLE_REGISTRY.length;
    const bike = MOTORCYCLE_REGISTRY[next];
    if (bike) selectBike(bike);
  };

  const handleSoundPreview = () => {
    if (isPlayingAudioPreview) return;
    sounds.init();
    sounds.resume();
    sounds.setProfile(selectedBike.sound);
    setIsPlayingAudioPreview(true);
    sounds.updateEngine(35, 0.65, true, false);

    window.setTimeout(() => {
      sounds.updateEngine(0, 0.25, false, false);
      window.setTimeout(() => {
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

  const resetLayout = () => {
    dragRef.current = null;
    setLayout({ ...DEFAULT_LAYOUT });
    onSongControlVisibilityChange?.(true);
  };

  const sizeClass =
    buttonSize === 'small'
      ? 'garage-small'
      : buttonSize === 'large'
        ? 'garage-large'
        : 'garage-medium';

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
          overflow: auto;
          background: rgba(9,9,11,.9);
          backdrop-filter: blur(12px);
          color: white;
        }

        .garage-header,
        .garage-main,
        .garage-footer {
          width: 100%;
          max-width: 1560px;
          margin-left: auto;
          margin-right: auto;
        }

        .garage-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-shrink: 0;
        }

        .garage-main {
          margin-top: auto;
          margin-bottom: auto;
          padding: 12px 0;
          display: grid;
          grid-template-columns: minmax(0,1fr);
          gap: 12px;
          align-items: center;
        }

        .garage-bike-list {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding: 4px;
        }

        .garage-bike-card { flex-shrink: 0; width: 175px; }

        .garage-viewer {
          height: 270px;
          min-height: 0;
          position: relative;
          overflow: hidden;
        }

        .garage-footer {
          padding-top: 10px;
          border-top: 1px solid rgba(63,63,70,.7);
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

        .garage-settings-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 11px;
          border: 1px solid rgba(34,211,238,.4);
          border-radius: 10px;
          background: rgba(8,47,73,.8);
          color: #67e8f9;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
        }

        .garage-settings-button:hover {
          border-color: rgba(34,211,238,.9);
          background: rgba(8,47,73,1);
        }

        .garage-panel {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          background: rgba(0,0,0,.84);
          backdrop-filter: blur(8px);
        }

        .garage-panel-inner {
          width: 100%;
          max-width: 460px;
          max-height: 91vh;
          overflow: auto;
          border: 1px solid rgba(34,211,238,.35);
          border-radius: 18px;
          background: #090e18;
          padding: 16px;
          color: white;
          box-shadow: 0 20px 70px rgba(0,0,0,.65);
        }

        .garage-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .garage-toggle {
          min-width: 58px;
          padding: 7px 9px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 900;
        }

        .garage-toggle.on { background: #0891b2; color: white; }
        .garage-toggle.off { background: #27272a; color: #a1a1aa; }

        .garage-choice {
          flex: 1;
          padding: 8px 4px;
          border: 1px solid #3f3f46;
          border-radius: 9px;
          background: #18181b;
          color: #a1a1aa;
          font-size: 11px;
          font-weight: 800;
        }

        .garage-choice.selected {
          border-color: #22d3ee;
          background: rgba(8,145,178,.25);
          color: #67e8f9;
        }

        .garage-edit-banner {
          position: fixed;
          z-index: 90;
          left: 50%;
          bottom: 8px;
          transform: translateX(-50%);
          padding: 8px 13px;
          border: 1px solid #22d3ee;
          border-radius: 12px;
          background: #082f49;
          color: #a5f3fc;
          font-size: 11px;
          font-weight: 800;
          pointer-events: none;
          white-space: nowrap;
        }

        .garage-small .garage-mode-button { transform: scale(.85); }
        .garage-small .garage-ride-button {
          padding: 7px 12px !important;
          font-size: 13px !important;
        }
        .garage-large .garage-mode-button { padding: 12px 16px !important; }
        .garage-large .garage-ride-button {
          padding: 14px 28px !important;
          font-size: 20px !important;
        }

        /* Screenshot-style three-column garage for landscape phones/tablets/desktop. */
        @media (orientation: landscape) and (min-width: 600px) {
          .garage-screen {
            padding: 7px 16px;
            overflow: hidden;
            gap: 5px;
          }

          .garage-header { height: 43px; min-height: 43px; }
          .garage-logo { width: 30px; height: 30px; }
          .garage-title { font-size: 20px !important; line-height: 22px; }
          .garage-subtitle { font-size: 8px !important; }

          .garage-main {
            flex: 1;
            min-height: 0;
            padding: 3px 0;
            grid-template-columns: minmax(145px, 19%) minmax(0, 1fr) minmax(190px, 24%);
            gap: 12px;
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
          }

          .garage-bike-card { width: 100%; padding: 7px !important; }
          .garage-viewer { height: 100%; min-height: 0; border-radius: 13px; }

          .garage-details {
            height: 100%;
            min-height: 0;
            overflow-y: auto;
            padding: 9px !important;
            gap: 7px !important;
          }

          .garage-footer {
            min-height: 43px;
            padding-top: 5px;
            flex-direction: row;
            justify-content: space-between;
            gap: 8px;
          }

          .garage-mode-buttons { flex-wrap: nowrap; flex-shrink: 0; }
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
          .garage-screen { padding: 5px 9px; }
          .garage-header { height: 36px; min-height: 36px; }
          .garage-main { gap: 7px; }
          .garage-footer { min-height: 38px; padding-top: 4px; }
          .garage-bike-card { padding: 5px !important; }
          .garage-details { padding: 7px !important; }
        }

        @media (max-width: 380px) {
          .garage-screen { padding: 8px; }
          .garage-title { font-size: 18px !important; }
          .garage-bike-card { width: 155px; }
          .garage-viewer { height: 240px; }
        }

        @media (max-height: 650px) and (orientation: portrait) {
          .garage-screen { justify-content: flex-start; gap: 8px; }
          .garage-main { margin-top: 4px; margin-bottom: 4px; }
          .garage-viewer { height: 220px; }
        }
      `}</style>

      <div className={`garage-screen ${sizeClass}`}>
        <header className="garage-header">
          <div className="flex min-w-0 items-center gap-2">
            <svg className="garage-logo h-10 w-10 shrink-0 text-cyan-400" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M8 36L16 12H24L18 36H8Z" fill="currentColor" />
              <path d="M22 36L30 12H38L32 36H22Z" fill="#d4af37" />
              <circle cx="34" cy="34" r="7" stroke="currentColor" strokeWidth="3" />
              <circle cx="14" cy="34" r="7" stroke="#d4af37" strokeWidth="3" />
            </svg>
            <div className="min-w-0">
              <h1 className="garage-title whitespace-nowrap font-chakra text-2xl font-black italic uppercase tracking-tight text-white md:text-3xl">
                Moto Rider <span className="text-cyan-400">Highway Rush</span>
              </h1>
              <p className="garage-subtitle font-mono-num text-[11px] text-zinc-400">
                ROYAL ENFIELD EDITION · {MOTORCYCLE_REGISTRY.length} MOTORCYCLES
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hud-panel garage-score rounded-lg px-3 py-1.5 text-right font-mono-num">
              <span className="block text-[10px] uppercase text-zinc-500">High Score</span>
              <span className="text-base font-bold text-cyan-400 md:text-lg">{highScore.toLocaleString()}</span>
            </div>

            <div style={itemStyle('mute')}>
              {dragHandle('mute')}
              {layout.mute.visible && (
                <button
                  onClick={onToggleMute}
                  className="hud-panel rounded-lg p-2.5 text-zinc-300 transition hover:text-white active:scale-95"
                  title={isMuted ? 'Unmute' : 'Mute'}
                  aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5 text-cyan-400" />}
                </button>
              )}
            </div>

            {/* Settings stays visible even when other layout items are hidden. */}
            <div style={itemStyle('settings')}>
              {dragHandle('settings')}
              <button onClick={() => setShowSettings(true)} className="garage-settings-button" aria-label="Garage settings">
                <Settings className="h-4 w-4" />
                SETTINGS
              </button>
            </div>
          </div>
        </header>

        <main className="garage-main">
          {layout.bikeList.visible && (
            <section className="garage-left flex flex-col space-y-2" style={itemStyle('bikeList')}>
              {dragHandle('bikeList')}
              <div className="flex shrink-0 items-center justify-between px-1 font-mono-num text-xs text-zinc-400">
                <span className="text-[10px]">SELECT BIKE ({currentIndex + 1}/{MOTORCYCLE_REGISTRY.length})</span>
                <div className="flex gap-1">
                  <button onClick={() => changeBike(-1)} className="rounded bg-zinc-800 p-1 text-white"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => changeBike(1)} className="rounded bg-zinc-800 p-1 text-white"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="garage-bike-list scrollbar-none">
                {MOTORCYCLE_REGISTRY.map((bike) => {
                  const active = bike.id === selectedBike.id;
                  return (
                    <button
                      key={bike.id}
                      onClick={() => selectBike(bike)}
                      className={`garage-bike-card rounded-xl border p-2.5 text-left transition ${
                        active
                          ? 'border-cyan-400 bg-cyan-950/70 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                          : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="garage-bike-card-name truncate font-chakra text-sm font-bold tracking-wide text-white">{bike.name}</span>
                        <span className="whitespace-nowrap rounded bg-zinc-800 px-1.5 py-0.5 font-mono-num text-[10px] text-zinc-300">{bike.displacementCc}cc</span>
                      </div>
                      <span className="garage-bike-card-series mt-0.5 block truncate text-[10px] text-zinc-400">{bike.series}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {layout.viewer.visible && (
            <section className="garage-viewer hud-panel flex items-center justify-center rounded-2xl" style={itemStyle('viewer')}>
              {dragHandle('viewer')}
              <MotorcycleViewer3D bike={selectedBike} />
              <div className="absolute left-3 top-3 rounded border border-zinc-700 bg-black/70 px-2.5 py-1 font-mono-num text-[11px] font-bold text-cyan-300">{selectedBike.badge}</div>

              {layout.exhaust.visible && (
                <div className="absolute bottom-3 right-3" style={itemStyle('exhaust')}>
                  {dragHandle('exhaust')}
                  <button
                    onClick={handleSoundPreview}
                    disabled={isPlayingAudioPreview}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 font-mono-num text-xs text-zinc-200 transition hover:border-cyan-400 disabled:opacity-60"
                  >
                    <Volume2 className={`h-3.5 w-3.5 ${isPlayingAudioPreview ? 'animate-pulse text-amber-400' : 'text-cyan-400'}`} />
                    {isPlayingAudioPreview ? 'REV SOUND...' : 'TEST EXHAUST'}
                  </button>
                </div>
              )}
            </section>
          )}

          {layout.details.visible && (
            <section className="garage-details hud-panel flex flex-col justify-between space-y-3 rounded-2xl p-4" style={itemStyle('details')}>
              {dragHandle('details')}
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                  <h2 className="truncate font-chakra text-lg font-bold text-white">{selectedBike.name}</h2>
                  <span className="whitespace-nowrap font-mono-num text-xs font-bold text-cyan-400">{selectedBike.engineType.split(' ')[0]}</span>
                </div>
                <p className="garage-description mt-2 text-[11px] leading-relaxed text-zinc-400">{selectedBike.description}</p>
              </div>

              <div className="garage-stats space-y-2 font-mono-num text-xs">
                {([
                  ['TOP SPEED', `${selectedBike.topSpeedKmh} KM/H`, Math.min(100, selectedBike.topSpeedKmh / 160 * 100), Gauge, 'bg-cyan-400'],
                  ['ACCELERATION', `${selectedBike.powerBhp} BHP (${selectedBike.accelerationScore}/10)`, Math.min(100, selectedBike.accelerationScore * 10), Zap, 'bg-amber-400'],
                  ['HANDLING', `${selectedBike.handlingScore}/10`, Math.min(100, selectedBike.handlingScore * 10), Sparkles, 'bg-emerald-400'],
                  ['BRAKES', `${selectedBike.brakingScore}/10`, Math.min(100, selectedBike.brakingScore * 10), Shield, 'bg-rose-400'],
                ] as const).map(([label, value, width, Icon, bar]) => (
                  <div key={label}>
                    <div className="mb-0.5 flex justify-between gap-2 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{label}</span>
                      <span className="font-bold text-white">{value}</span>
                    </div>
                    <div className="garage-stat-bar h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="garage-cooling flex justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-2 font-mono-num text-[11px] text-zinc-300">
                <span className="truncate">{selectedBike.cooling}</span>
                <span className="whitespace-nowrap text-amber-400">{selectedBike.torqueNm} Nm Torque</span>
              </div>
            </section>
          )}
        </main>

        <footer className="garage-footer">
          {layout.modes.visible && (
            <div className="garage-mode-buttons relative rounded-xl border border-zinc-800 bg-zinc-900/90 p-1" style={itemStyle('modes')}>
              {dragHandle('modes')}
              {(['one-way', 'two-way', 'time-rush'] as GameMode[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`garage-mode-button rounded-lg px-3 py-1.5 font-chakra text-xs font-bold tracking-wider transition ${
                    mode === value
                      ? value === 'one-way'
                        ? 'bg-cyan-500 text-black shadow-md'
                        : value === 'two-way'
                          ? 'bg-amber-500 text-black shadow-md'
                          : 'bg-rose-500 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {value === 'one-way' ? 'ONE-WAY' : value === 'two-way' ? 'TWO-WAY (DANGER)' : 'TIME RUSH'}
                </button>
              ))}
            </div>
          )}

          <div className="garage-info flex max-w-md items-center gap-1.5 text-center font-mono-num text-[10px] text-zinc-500">
            <Info className="h-4 w-4 shrink-0 text-zinc-400" />
            <span>{selectedBike.modelLegalNote} Acoustic simulation synthesized procedurally with Web Audio API.</span>
          </div>

          {layout.ride.visible && (
            <div className="relative w-full" style={itemStyle('ride')}>
              {dragHandle('ride')}
              <button
                onClick={startGame}
                className="garage-ride-button flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-8 py-3 font-chakra text-lg font-black tracking-widest text-black shadow-[0_0_24px_rgba(0,229,255,0.5)] transition active:scale-95 md:text-xl"
              >
                <Play className="h-6 w-6 fill-black" />
                <span>RIDE {selectedBike.name.toUpperCase()}</span>
              </button>
            </div>
          )}
        </footer>

        {(onOpenFriends || onOpenMultiplayer) && (
          <div className="fixed bottom-3 right-3 z-40 flex flex-col gap-2">
            {onOpenFriends && layout.friends.visible && (
              <div className="relative" style={itemStyle('friends')}>
                {dragHandle('friends')}
                <button onClick={onOpenFriends} className="rounded-xl border border-emerald-300/50 bg-slate-950/95 px-4 py-3 font-bold text-white shadow-lg">👥 Friends</button>
              </div>
            )}
            {onOpenMultiplayer && layout.multiplayer.visible && (
              <div className="relative" style={itemStyle('multiplayer')}>
                {dragHandle('multiplayer')}
                <button onClick={onOpenMultiplayer} className="rounded-xl border border-cyan-300/50 bg-slate-950/95 px-4 py-3 font-bold text-white shadow-lg">
                  {isMultiplayerOpen ? 'Close Multiplayer' : '🌐 Multiplayer'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {editLayout && (
        <div className="garage-edit-banner">
          LAYOUT EDIT MODE · Drag the <Move className="inline h-3 w-3" /> handles · Changes auto-save
        </div>
      )}

      {showSettings && (
        <div className="garage-panel" onClick={() => setShowSettings(false)}>
          <div className="garage-panel-inner" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-cyan-300"><Settings className="h-5 w-5" />GARAGE SETTINGS</h2>
                <p className="mt-1 text-[10px] tracking-wider text-zinc-500">CUSTOMIZE YOUR GARAGE SCREEN</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="rounded-lg bg-zinc-800 p-2 text-zinc-300" aria-label="Close settings"><X className="h-5 w-5" /></button>
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Default Button Size</p>
            <div className="mb-5 flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button key={size} onClick={() => setButtonSize(size)} className={`garage-choice ${buttonSize === size ? 'selected' : ''}`}>{size.toUpperCase()}</button>
              ))}
            </div>

            <div className="mb-4 flex gap-2">
              <button onClick={() => setEditLayout((value) => !value)} className={`flex-1 rounded-xl p-3 text-xs font-black ${editLayout ? 'bg-amber-500 text-black' : 'bg-cyan-700 text-white'}`}>
                <Move className="mr-1 inline h-4 w-4" />{editLayout ? 'DONE MOVING' : 'DRAG & MOVE ITEMS'}
              </button>
              <button onClick={resetLayout} className="flex items-center justify-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-bold text-zinc-300"><RotateCcw className="h-4 w-4" />RESET</button>
            </div>

            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-400">Show / Hide and Individual Size</p>
            <p className="mb-2 text-[10px] text-zinc-500">Use move mode, then drag each item's handle on the screen. Each item's size is saved separately.</p>

            {(Object.keys(LABELS) as ItemId[]).map((id) => (
              <div className="garage-row" key={id}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-zinc-200">{LABELS[id]}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <button onClick={() => updateItem(id, { scale: Math.max(0.65, +(layout[id].scale - 0.05).toFixed(2)) })} className="rounded bg-zinc-800 p-1.5 text-zinc-200" aria-label={`Make ${LABELS[id]} smaller`}><Minus className="h-3 w-3" /></button>
                    <span className="w-10 text-center font-mono-num text-[10px] text-cyan-300">{Math.round(layout[id].scale * 100)}%</span>
                    <button onClick={() => updateItem(id, { scale: Math.min(1.5, +(layout[id].scale + 0.05).toFixed(2)) })} className="rounded bg-zinc-800 p-1.5 text-zinc-200" aria-label={`Make ${LABELS[id]} larger`}><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
                <button
                  disabled={id === 'settings'}
                  onClick={() => updateItem(id, { visible: !layout[id].visible })}
                  className={`garage-toggle ${layout[id].visible ? 'on' : 'off'} disabled:cursor-not-allowed disabled:opacity-50`}
                  title={id === 'settings' ? 'Settings cannot be hidden' : 'Show or hide this item'}
                >
                  <span className="flex items-center justify-center gap-1">
                    {layout[id].visible ? <><Eye className="h-3 w-3" />ON</> : <><EyeOff className="h-3 w-3" />OFF</>}
                  </span>
                </button>
              </div>
            ))}

            <div className="mt-5 flex gap-2">
              <button onClick={resetLayout} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs font-bold text-zinc-300"><RotateCcw className="h-4 w-4" />RESET LAYOUT</button>
              <button onClick={() => { setEditLayout(false); setShowSettings(false); }} className="flex-1 rounded-xl bg-cyan-600 p-3 text-xs font-black text-white">SAVE & CLOSE</button>
            </div>

            <p className="mt-3 text-center text-[10px] text-zinc-600">Your layout and sizes are saved automatically on this device.</p>
          </div>
        </div>
      )}
    </>
  );
};
