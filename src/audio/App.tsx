import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sounds } from './audio/SoundEffects';
import { GameOverModal } from './components/GameOverModal';
import { HUD } from './components/HUD';
import { PauseModal } from './components/PauseModal';
import { StartScreen } from './components/StartScreen';
import { GameMode, GameStats } from './game/constants';
import { GameEngine, InputState } from './game/GameEngine';
import { MOTORCYCLE_REGISTRY, MotorcycleConfig } from './game/motorcycles';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [selectedBike, setSelectedBike] = useState<MotorcycleConfig>(MOTORCYCLE_REGISTRY[0]);
  const [currentMode, setCurrentMode] = useState<GameMode>('one-way');
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

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

  // Reusable keyboard input state
  const inputsRef = useRef<InputState>({
    steerLeft: false,
    steerRight: false,
    throttle: false,
    brake: false,
    horn: false,
    boost: false,
  });

  // Initialize WebGL Game Engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current, selectedBike);
    engineRef.current = engine;

    engine.onStatsUpdate = (stats) => {
      setGameStats(stats);
      if (stats.score > highScore) {
        setHighScore(stats.score);
        setIsNewHigh(true);
        try {
          localStorage.setItem('moto_rider_highscore', stats.score.toString());
        } catch {
          // ignore
        }
      }
    };

    engine.onGameOver = (finalStats) => {
      setGameStats(finalStats);
      setIsGameOver(true);
      setGameStarted(false);
    };

    // Keyboard handlers
    const onKeyDown = (e: KeyboardEvent) => {
      // Initialize audio on first key press
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
      // Clear held keys on blur as per guidelines
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
    };
  }, []);

  const handleSelectBike = useCallback((bike: MotorcycleConfig) => {
    setSelectedBike(bike);
    if (engineRef.current) {
      engineRef.current.setMotorcycle(bike);
    }
  }, []);

  const handleStartGame = useCallback((mode: GameMode, bike: MotorcycleConfig) => {
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
  }, []);

  const handlePause = useCallback(() => {
    if (engineRef.current && engineRef.current.isRunning && !engineRef.current.isGameOver) {
      engineRef.current.pauseGame();
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
      engineRef.current.startGame(currentMode);
    }
  }, [currentMode]);

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
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  }, [isMuted]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* In-Game First-Person Cockpit HUD */}
      {gameStarted && !isPaused && !isGameOver && (
        <HUD
          stats={gameStats}
          inputs={engineRef.current ? engineRef.current.inputs : inputsRef.current}
          onPause={handlePause}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          mode={currentMode}
        />
      )}

      {/* Start & Motorcycle Selection Screen */}
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

      {/* Pause Menu Modal */}
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

      {/* Game Over Modal */}
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
