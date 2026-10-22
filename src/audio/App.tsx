import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sounds } from './SoundEffects';

import { GameOverModal } from '../../GameOverModal';
import { HUD } from '../../HUD';
import { PauseModal } from '../../PauseModal';
import { StartScreen } from '../../StartScreen';

import {
  GameMode,
  GameStats,
} from '../../constants';

import {
  GameEngine,
  InputState,
} from '../../GameEngine';

import {
  MOTORCYCLE_REGISTRY,
  MotorcycleConfig,
} from '../../motorcycles';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

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
      } else if (
        code === 'KeyP' ||
        code === 'Escape'
      ) {
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

  const handleSelectBike = useCallback(
    (bike: MotorcycleConfig) => {
      setSelectedBike(bike);

      if (engineRef.current) {
        engineRef.current.setMotorcycle(bike);
      }
    },
    []
  );

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

    if (
      engine &&
      engine.isRunning &&
      !engine.isGameOver
    ) {
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

      {!gameStarted && !isGameOver && (
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
    </div>
  );
}
