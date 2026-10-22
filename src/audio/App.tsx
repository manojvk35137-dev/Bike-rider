
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sounds } from './SoundEffects';

import { GameOverModal } from '../../GameOverModal';
import { HUD } from '../../HUD';
import { PauseModal } from '../../PauseModal';
import { StartScreen } from '../../StartScreen';

import { GameMode, GameStats } from '../../constants';
import { GameEngine, InputState } from '../../GameEngine';
import { MOTORCYCLE_REGISTRY, MotorcycleConfig } from '../../motorcycles';

const INTRO_DURATION = 5000;

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [showIntro, setShowIntro] = useState(true);

  const [selectedBike, setSelectedBike] =
    useState<MotorcycleConfig>(MOTORCYCLE_REGISTRY[0]);

  const [currentMode, setCurrentMode] =
    useState<GameMode>('one-way');

  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('moto_rider_highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [gameStats, setGameStats] = useState<GameStats>({
    speedKmh: 0,
    rpmNorm: 0.2,
    gear: 1,
    distanceMeters: 0,
    score: 0,
    closeCalls: 0,
    combo: 0,
    timeLeft: 75,
    gameOver: false,
    gameStarted: false,
    isPaused: false,
    lastCloseCallText: null,
    lastCloseCallPoints: 0,
  });

  const inputsRef = useRef<InputState>({
    steerLeft: false,
    steerRight: false,
    throttle: false,
    brake: false,
    horn: false,
    boost: false,
  });

  // Show the intro once when the app opens.
  useEffect(() => {
    const introTimer = window.setTimeout(() => {
      setShowIntro(false);
    }, INTRO_DURATION);

    return () => window.clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(
      canvasMountRef.current,
      selectedBike
    );

    engineRef.current = engine;

    engine.onStatsUpdate = (stats) => {
      setGameStats(stats);

      setHighScore((previous) => {
        if (stats.score <= previous) return previous;

        setIsNewHigh(true);

        try {
          localStorage.setItem(
            'moto_rider_highscore',
            stats.score.toString()
          );
        } catch {
          // Local storage may be unavailable.
        }

        return stats.score;
      });
    };

    engine.onGameOver = (finalStats) => {
      setGameStats(finalStats);
      setIsGameOver(true);
      setGameStarted(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      sounds.init();
      sounds.resume();

      if (e.repeat) return;

      const code = e.code;

      if (code === 'KeyW' || code === 'ArrowUp') {
        engine.inputs.throttle = true;
        inputsRef.current.throttle = true;
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        engine.inputs.brake = true;
        inputsRef.current.brake = true;
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        engine.inputs.steerLeft = true;
        inputsRef.current.steerLeft = true;
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        engine.inputs.steerRight = true;
        inputsRef.current.steerRight = true;
      } else if (code === 'Space') {
        engine.inputs.boost = true;
        inputsRef.current.boost = true;
      } else if (code === 'KeyH') {
        engine.inputs.horn = true;
        inputsRef.current.horn = true;
      } else if (code === 'KeyP' || code === 'Escape') {
        if (engine.isRunning && !engine.isGameOver) {
          if (engine.isPaused) {
            engine.resumeGame();
            setIsPaused(false);
          } else {
            engine.pauseGame();
            setIsPaused(true);
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;

      if (code === 'KeyW' || code === 'ArrowUp') {
        engine.inputs.throttle = false;
        inputsRef.current.throttle = false;
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        engine.inputs.brake = false;
        inputsRef.current.brake = false;
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        engine.inputs.steerLeft = false;
        inputsRef.current.steerLeft = false;
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        engine.inputs.steerRight = false;
        inputsRef.current.steerRight = false;
      } else if (code === 'Space') {
        engine.inputs.boost = false;
        inputsRef.current.boost = false;
      } else if (code === 'KeyH') {
        engine.inputs.horn = false;
        inputsRef.current.horn = false;
      }
    };

    const onBlur = () => {
      engine.inputs.steerLeft = false;
      engine.inputs.steerRight = false;
      engine.inputs.throttle = false;
      engine.inputs.brake = false;
      engine.inputs.boost = false;
      engine.inputs.horn = false;

      inputsRef.current.steerLeft = false;
      inputsRef.current.steerRight = false;
      inputsRef.current.throttle = false;
      inputsRef.current.brake = false;
      inputsRef.current.boost = false;
      inputsRef.current.horn = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);

      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleSelectBike = useCallback((bike: MotorcycleConfig) => {
    setSelectedBike(bike);

    if (engineRef.current) {
      engineRef.current.setMotorcycle(bike);
    }
  }, []);

  const handleStartGame = useCallback(
    (mode: GameMode, bike: MotorcycleConfig) => {
      setCurrentMode(mode);
      setSelectedBike(bike);
      setIsNewHigh(false);
      setIsGameOver(false);
      setIsPaused(false);
      setGameStarted(true);

      if (engineRef.current) {
        engineRef.current.setMotorcycle(bike);
        engineRef.current.startGame(mode);
      }
    },
    []
  );

  const handlePause = useCallback(() => {
    const engine = engineRef.current;

    if (engine && engine.isRunning && !engine.isGameOver) {
      engine.pauseGame();
      setIsPaused(true);
    }
  }, []);

  const handleResume = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resumeGame();
      setIsPaused(false);
    }
  }, []);

  const handleRestart = useCallback(() => {
    setIsNewHigh(false);
    setIsGameOver(false);
    setIsPaused(false);
    setGameStarted(true);

    if (engineRef.current) {
      engineRef.current.setMotorcycle(selectedBike);
      engineRef.current.startGame(currentMode);
    }
  }, [currentMode, selectedBike]);

  const handleReturnToGarage = useCallback(() => {
    setIsGameOver(false);
    setIsPaused(false);
    setGameStarted(false);

    sounds.stopAll();

    if (engineRef.current) {
      engineRef.current.isRunning = false;
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const next = !previous;
      sounds.setMuted(next);
      return next;
    });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Five-second creator intro */}
      {showIntro && (
        <div
          className="creator-intro fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          aria-label="Created by Nidhin"
        >
          <div className="intro-grid" />
          <div className="intro-orb intro-orb-one" />
          <div className="intro-orb intro-orb-two" />
          <div className="intro-light intro-light-one" />
          <div className="intro-light intro-light-two" />

          <div className="intro-content text-center">
            <div className="intro-line" />

            <p className="intro-caption">
              BUILT WITH PASSION
            </p>

            <h1 className="intro-name">
              NIDHIN
            </h1>

            <p className="intro-created">
              CREATED BY
            </p>

            <div className="intro-bottom-line" />

            <p className="intro-subtitle">
              TWO WHEELS. ONE JOURNEY.
            </p>
          </div>

          <div className="intro-corner intro-corner-tl" />
          <div className="intro-corner intro-corner-br" />

          <div className="intro-loader">
            <span />
          </div>
        </div>
      )}

      {gameStarted && !isPaused && !isGameOver && (
        <HUD
          stats={gameStats}
          inputs={
            engineRef.current
              ? engineRef.current.inputs
              : inputsRef.current
          }
          onPause={handlePause}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          mode={currentMode}
        />
      )}

      {!showIntro && !gameStarted && !isGameOver && (
        <StartScreen
          onStartGame={handleStartGame}
          highScore={highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          selectedBike={selectedBike}
          onSelectBike={handleSelectBike}
        />
      )}

      {isPaused && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnToGarage={handleReturnToGarage}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          bike={selectedBike}
        />
      )}

      {isGameOver && (
        <GameOverModal
          stats={gameStats}
          highScore={highScore}
          isNewHigh={isNewHigh}
          bike={selectedBike}
          onRestart={handleRestart}
          onReturnToGarage={handleReturnToGarage}
        />
      )}

      {/* Intro animation styling */}
      <style>{`
        .creator-intro {
          isolation: isolate;
          background:
            radial-gradient(ellipse at 50% 45%, #102e55 0%, #071323 42%, #02050c 78%, #000 100%);
          color: #fff;
          animation: introFadeOut 0.8s ease-in-out 4.2s forwards;
        }

        .intro-grid {
          position: absolute;
          inset: -50%;
          z-index: -1;
          opacity: 0.16;
          background-image:
            linear-gradient(rgba(67, 163, 255, 0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(67, 163, 255, 0.25) 1px, transparent 1px);
          background-size: 42px 42px;
          transform: perspective(500px) rotateX(58deg) scale(1.5);
          animation: introGridMove 5s linear infinite;
          mask-image: linear-gradient(transparent, #000 35%, #000 70%, transparent);
        }

        .intro-orb {
          position: absolute;
          width: min(65vw, 360px);
          aspect-ratio: 1;
          border-radius: 50%;
          filter: blur(65px);
          opacity: 0;
          z-index: -1;
        }

        .intro-orb-one {
          background: #087bff;
          animation: orbAppear 3s ease-out 0.2s forwards;
          left: -20%;
          top: 10%;
        }

        .intro-orb-two {
          background: #00d5ff;
          animation: orbAppear 3s ease-out 0.8s forwards;
          right: -25%;
          bottom: 0;
        }

        .intro-light {
          position: absolute;
          width: 150%;
          height: 2px;
          left: -25%;
          background: linear-gradient(90deg, transparent, #39baff, #fff, #1678ff, transparent);
          box-shadow: 0 0 22px #168cff;
          opacity: 0;
          z-index: -1;
        }

        .intro-light-one {
          top: 35%;
          animation: lightSweep 2.3s ease-in-out 0.6s both;
        }

        .intro-light-two {
          top: 67%;
          animation: lightSweep 2s ease-in-out 1.4s both;
        }

        .intro-content {
          width: 100%;
          padding: 24px;
          animation: introContentIn 1.1s cubic-bezier(.2,.8,.2,1) both;
        }

        .intro-line,
        .intro-bottom-line {
          height: 2px;
          width: 0;
          margin: 0 auto;
          background: linear-gradient(90deg, transparent, #4bcaff, #fff, #4bcaff, transparent);
          box-shadow: 0 0 18px #159dff;
          animation: lineExpand 0.8s ease-out 0.3s forwards;
        }

        .intro-caption {
          margin: 23px 0 10px;
          font-size: 10px;
          letter-spacing: 0.48em;
          color: #8dcfff;
          opacity: 0;
          animation: textAppear 0.7s ease-out 0.65s forwards;
        }

        .intro-name {
          margin: 0;
          font-size: clamp(48px, 13vw, 104px);
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: 0.12em;
          padding-left: 0.12em;
          color: #fff;
          text-shadow:
            0 0 8px rgba(255,255,255,.9),
            0 0 22px rgba(48,166,255,.9),
            0 0 55px rgba(0,105,255,.75);
          opacity: 0;
          animation: nameReveal 1.1s cubic-bezier(.16,1,.3,1) 0.8s forwards;
        }

        .intro-created {
          margin: 12px 0 21px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.65em;
          padding-left: 0.65em;
          color: #d6ecff;
          opacity: 0;
          animation: textAppear 0.8s ease-out 1.55s forwards;
        }

        .intro-bottom-line {
          animation-delay: 1.8s;
        }

        .intro-subtitle {
          margin-top: 18px;
          font-size: 9px;
          letter-spacing: 0.34em;
          color: #76baff;
          opacity: 0;
          animation: textAppear 0.8s ease-out 2s forwards;
        }

        .intro-corner {
          position: absolute;
          width: 28px;
          height: 28px;
          border-color: rgba(92,190,255,.8);
          opacity: 0;
          animation: textAppear 0.6s ease-out 0.5s forwards;
        }

        .intro-corner-tl {
          top: 22px;
          left: 22px;
          border-top: 1px solid;
          border-left: 1px solid;
        }

        .intro-corner-br {
          bottom: 22px;
          right: 22px;
          border-bottom: 1px solid;
          border-right: 1px solid;
        }

        .intro-loader {
          position: absolute;
          left: 50%;
          bottom: 12%;
          transform: translateX(-50%);
          width: min(180px, 45vw);
          height: 2px;
          overflow: hidden;
          background: rgba(120,180,255,.18);
        }

        .intro-loader span {
          display: block;
          width: 0;
          height: 100%;
          background: #69d5ff;
          box-shadow: 0 0 12px #29aaff;
          animation: loaderFill 4.1s linear forwards;
        }

        @keyframes introFadeOut {
          to { opacity: 0; visibility: hidden; }
        }

        @keyframes introContentIn {
          from { opacity: 0; transform: translateY(18px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes nameReveal {
          from { opacity: 0; transform: scale(1.3); filter: blur(12px); }
          to { opacity: 1; transform: scale(1); filter: blur(0); }
        }

        @keyframes textAppear {
          from { opacity: 0; transform: translateY(9px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes lineExpand {
          from { width: 0; }
          to { width: min(270px, 70vw); }
        }

        @keyframes lightSweep {
          0% { opacity: 0; transform: translateX(-35%) scaleX(.3); }
          35% { opacity: .9; }
          100% { opacity: 0; transform: translateX(35%) scaleX(1.1); }
        }

        @keyframes orbAppear {
          0% { opacity: 0; transform: scale(.6); }
          45% { opacity: .28; }
          100% { opacity: .12; transform: scale(1.15); }
        }

        @keyframes introGridMove {
          from { background-position: 0 0; }
          to { background-position: 0 42px; }
        }

        @keyframes loaderFill {
          from { width: 0; }
          to { width: 100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .creator-intro *,
          .creator-intro {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
