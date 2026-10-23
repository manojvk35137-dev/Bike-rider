import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { sounds } from './SoundEffects';

import { GameOverModal } from '../../GameOverModal';
import { HUD } from '../../HUD';
import { PauseModal } from '../../PauseModal';
import { StartScreen } from '../../StartScreen';

import { GameMode, GameStats } from '../../constants';
import { GameEngine, InputState } from '../../GameEngine';
import { MOTORCYCLE_REGISTRY, MotorcycleConfig } from '../../motorcycles';

const INTRO_DURATION = 5000;
const SERVER_URL = 'https://bike-rider-multiplayer.onrender.com';

type MultiplayerMode = 'race' | 'free-ride';

type Friend = {
  username: string;
  online: boolean;
};

type RoomInvite = {
  inviteId: string;
  from: string;
  to?: string;
  roomCode: string;
  mode: MultiplayerMode;
};

type ServerAck = {
  success?: boolean;
  error?: string;
  message?: string;
  username?: string;
  roomCode?: string;
  mode?: MultiplayerMode;
  playerCount?: number;
  accepted?: boolean;
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef('');
  const multiplayerModeRef = useRef<MultiplayerMode>('race');
  const pendingUsernameRef = useRef('');
  const connectedOnceRef = useRef(false);

  const [showIntro, setShowIntro] = useState(true);
  const [selectedBike, setSelectedBike] =
    useState<MotorcycleConfig>(MOTORCYCLE_REGISTRY[0]);
  const [currentMode, setCurrentMode] = useState<GameMode>('one-way');

  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [activeRoom, setActiveRoom] = useState('');
  const [multiplayerMode, setMultiplayerMode] =
    useState<MultiplayerMode>('race');
  const [playerCount, setPlayerCount] = useState(0);
  const [multiplayerMessage, setMultiplayerMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<string[]>([]);
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([]);
  const [friendsMessage, setFriendsMessage] = useState('');
  const [isSettingUsername, setIsSettingUsername] = useState(false);

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
    const timer = window.setTimeout(
      () => setShowIntro(false),
      INTRO_DURATION
    );
    return () => window.clearTimeout(timer);
  }, []);

  // Create the game engine once.
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current, selectedBike);
    engineRef.current = engine;

    engine.onStatsUpdate = (stats) => {
      setGameStats(stats);

      setHighScore((previous) => {
        if (stats.score <= previous) return previous;

        setIsNewHigh(true);
        try {
          localStorage.setItem('moto_rider_highscore', stats.score.toString());
        } catch {
          // Local storage may be unavailable.
        }
        return stats.score;
      });
    };

    engine.onGameOver = (stats) => {
      setGameStats(stats);
      setIsGameOver(true);
      setGameStarted(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const game = engineRef.current;
      if (!game) return;

      sounds.init();
      sounds.resume();
      if (e.repeat) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          game.inputs.throttle = true;
          inputsRef.current.throttle = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          game.inputs.brake = true;
          inputsRef.current.brake = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          game.inputs.steerLeft = true;
          inputsRef.current.steerLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          game.inputs.steerRight = true;
          inputsRef.current.steerRight = true;
          break;
        case 'Space':
          game.inputs.boost = true;
          inputsRef.current.boost = true;
          break;
        case 'KeyH':
          game.inputs.horn = true;
          inputsRef.current.horn = true;
          break;
        case 'KeyP':
        case 'Escape':
          if (game.isRunning && !game.isGameOver) {
            if (game.isPaused) {
              game.resumeGame();
              setIsPaused(false);
            } else {
              game.pauseGame();
              setIsPaused(true);
            }
          }
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const game = engineRef.current;
      if (!game) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          game.inputs.throttle = false;
          inputsRef.current.throttle = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          game.inputs.brake = false;
          inputsRef.current.brake = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          game.inputs.steerLeft = false;
          inputsRef.current.steerLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          game.inputs.steerRight = false;
          inputsRef.current.steerRight = false;
          break;
        case 'Space':
          game.inputs.boost = false;
          inputsRef.current.boost = false;
          break;
        case 'KeyH':
          game.inputs.horn = false;
          inputsRef.current.horn = false;
          break;
      }
    };

    const onBlur = () => {
      const game = engineRef.current;
      if (game) {
        game.inputs = {
          steerLeft: false,
          steerRight: false,
          throttle: false,
          brake: false,
          horn: false,
          boost: false,
        };
      }
      inputsRef.current = {
        steerLeft: false,
        steerRight: false,
        throttle: false,
        brake: false,
        horn: false,
        boost: false,
      };
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

  const getSocket = useCallback((): Socket => {
    if (socketRef.current) return socketRef.current;

    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setMultiplayerMessage('Connected to multiplayer server.');
      // The server stores usernames in memory, so re-register after reconnect.
      if (pendingUsernameRef.current) {
        socket.emit('setUsername', pendingUsernameRef.current, (result: ServerAck) => {
          if (result?.success && result.username) {
            setUsername(result.username);
            setUsernameInput(result.username);
          } else if (result?.error) {
            setFriendsMessage(result.error);
          }
        });
      }
    });

    socket.on('connect_error', () => {
      setMultiplayerMessage('Connection failed. Please try again in a moment.');
      setFriendsMessage('Could not connect to multiplayer server.');
      setIsConnecting(false);
      setIsSettingUsername(false);
    });

    socket.on('playerJoined', (data: { playerCount?: number }) => {
      if (typeof data?.playerCount === 'number') setPlayerCount(data.playerCount);
    });

    socket.on('playerLeft', () => {
      setPlayerCount((count) => Math.max(1, count - 1));
      engineRef.current?.clearRemotePlayers();
    });

    socket.on('playerState', (state) => {
      engineRef.current?.updateRemotePlayer(state);
    });

    socket.on('friendsList', (list: Friend[]) => {
      setFriends(Array.isArray(list) ? list : []);
    });

    socket.on('friendRequests', (requests: string[]) => {
      setFriendRequests(Array.isArray(requests) ? requests : []);
    });

    socket.on('roomInvite', (invite: RoomInvite) => {
      if (!invite?.inviteId || !invite?.roomCode || !invite?.from) return;
      setRoomInvites((previous) =>
        previous.some((item) => item.inviteId === invite.inviteId)
          ? previous
          : [...previous, invite]
      );
      setFriendsMessage(`${invite.from} invited you to a room.`);
      setShowFriends(true);
    });

    return socket;
  }, []);

  useEffect(() => {
    if (!activeRoom || !gameStarted) return;
    const socket = socketRef.current;
    if (!socket) return;

    const timer = window.setInterval(() => {
      const engine = engineRef.current;
      if (!engine || !engine.isRunning || engine.isPaused || !socket.connected) return;

      socket.emit('playerState', {
        x: engine.playerX,
        z: engine.playerZ,
        rotation: engine.currentLean,
        speed: engine.speedKmh,
        bikeId: engine.currentBike.id,
      });
    }, 50);

    return () => window.clearInterval(timer);
  }, [activeRoom, gameStarted]);

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    if (socket && activeRoomRef.current) socket.emit('leaveRoom');

    activeRoomRef.current = '';
    setActiveRoom('');
    setPlayerCount(0);
    engineRef.current?.clearRemotePlayers();
    setMultiplayerMessage('You left the room.');
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveRoom');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const createRoom = useCallback(() => {
    const socket = getSocket();
    setIsConnecting(true);
    setMultiplayerMessage('Connecting and creating room...');

    const doCreate = () => {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      socket.emit('createRoom', { roomCode: code, mode: multiplayerModeRef.current }, (result: ServerAck) => {
        setIsConnecting(false);
        if (!result?.success || !result.roomCode) {
          setMultiplayerMessage(result?.error || 'Could not create room.');
          return;
        }
        activeRoomRef.current = result.roomCode;
        setActiveRoom(result.roomCode);
        setRoomCode(result.roomCode);
        setPlayerCount(1);
        setMultiplayerMessage(`Room ${result.roomCode} created. Share the code with friends.`);
      });
    };

    if (socket.connected) doCreate();
    else {
      socket.once('connect', doCreate);
      socket.once('connect_error', () => setIsConnecting(false));
      socket.connect();
    }
  }, [getSocket]);

  const joinRoom = useCallback(() => {
    const code = roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) {
      setMultiplayerMessage('Enter a valid room code (4–8 letters/numbers).');
      return;
    }

    const socket = getSocket();
    setIsConnecting(true);
    setMultiplayerMessage('Joining room...');

    const doJoin = () => {
      socket.emit('joinRoom', { roomCode: code }, (result: ServerAck) => {
        setIsConnecting(false);
        if (!result?.success || !result.roomCode) {
          setMultiplayerMessage(result?.error || 'Could not join room.');
          return;
        }
        activeRoomRef.current = result.roomCode;
        setActiveRoom(result.roomCode);
        setRoomCode(result.roomCode);
        setPlayerCount(result.playerCount || 1);
        setMultiplayerMessage(`Joined room ${result.roomCode}.`);
      });
    };

    if (socket.connected) doJoin();
    else {
      socket.once('connect', doJoin);
      socket.once('connect_error', () => setIsConnecting(false));
      socket.connect();
    }
  }, [getSocket, roomCode]);

  const setMyUsername = useCallback(() => {
    const cleanName = usernameInput.trim();
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(cleanName)) {
      setFriendsMessage('Username must be 3–16 letters, numbers or underscores.');
      return;
    }

    const socket = getSocket();
    pendingUsernameRef.current = cleanName;
    setIsSettingUsername(true);
    setFriendsMessage('Setting username...');

    const submit = () => {
      socket.emit('setUsername', cleanName, (result: ServerAck) => {
        setIsSettingUsername(false);
        if (!result?.success || !result.username) {
          setFriendsMessage(result?.error || 'Could not set username.');
          return;
        }
        pendingUsernameRef.current = result.username;
        setUsername(result.username);
        setUsernameInput(result.username);
        setFriendsMessage(`Welcome, ${result.username}!`);
      });
    };

    if (socket.connected) submit();
    else {
      socket.once('connect', submit);
      socket.once('connect_error', () => {
        setIsSettingUsername(false);
        setFriendsMessage('Could not connect to multiplayer server.');
      });
      socket.connect();
    }
  }, [getSocket, usernameInput]);

  const addFriend = useCallback(() => {
    const name = friendInput.trim();
    if (!username) {
      setFriendsMessage('Set your username first.');
      return;
    }
    if (!name) {
      setFriendsMessage('Enter a friend username.');
      return;
    }

    const socket = getSocket();
    socket.emit('addFriend', name, (result: ServerAck) => {
      setFriendsMessage(result?.success ? result.message || 'Friend request sent.' : result?.error || 'Could not send request.');
      if (result?.success) setFriendInput('');
    });
  }, [friendInput, getSocket, username]);

  const respondToFriendRequest = useCallback((requestUsername: string, accept: boolean) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setFriendsMessage('Server is not connected.');
      return;
    }

    socket.emit('respondFriendRequest', { username: requestUsername, accept }, (result: ServerAck) => {
      setFriendsMessage(result?.success ? (accept ? `${requestUsername} is now your friend!` : 'Request declined.') : result?.error || 'Could not process request.');
    });
  }, []);

  const inviteFriendToRoom = useCallback((friendUsername: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setFriendsMessage('Server is not connected.');
      return;
    }

    socket.emit('inviteToRoom', { username: friendUsername }, (result: ServerAck) => {
      setFriendsMessage(result?.success ? result.message || `Invite sent to ${friendUsername}.` : result?.error || 'Could not send invite.');
    });
  }, []);

  const respondToRoomInvite = useCallback((invite: RoomInvite, accept: boolean) => {
    const socket = getSocket();
    socket.emit('respondRoomInvite', { inviteId: invite.inviteId, accept }, (result: ServerAck) => {
      setRoomInvites((previous) => previous.filter((item) => item.inviteId !== invite.inviteId));

      if (!result?.success) {
        setFriendsMessage(result?.error || 'Could not process room invite.');
        return;
      }
      if (!accept || !result.accepted || !result.roomCode) {
        setFriendsMessage('Room invite declined.');
        return;
      }

      activeRoomRef.current = result.roomCode;
      setActiveRoom(result.roomCode);
      setRoomCode(result.roomCode);
      setPlayerCount(result.playerCount || 2);

      const mode = result.mode || invite.mode;
      multiplayerModeRef.current = mode;
      setMultiplayerMode(mode);
      setShowMultiplayer(true);
      setShowFriends(false);
      setFriendsMessage(`Joined ${invite.from}'s room: ${result.roomCode}`);
    });
  }, [getSocket]);

  const handleSelectBike = useCallback((bike: MotorcycleConfig) => {
    setSelectedBike(bike);
    engineRef.current?.setMotorcycle(bike);
  }, []);

  const handleStartGame = useCallback((mode: GameMode, bike: MotorcycleConfig) => {
    setCurrentMode(mode);
    setSelectedBike(bike);
    setIsNewHigh(false);
    setIsGameOver(false);
    setIsPaused(false);
    setGameStarted(true);
    engineRef.current?.setMotorcycle(bike);
    engineRef.current?.startGame(mode);
  }, []);

  const handlePause = useCallback(() => {
    const engine = engineRef.current;
    if (engine && engine.isRunning && !engine.isGameOver) {
      engine.pauseGame();
      setIsPaused(true);
    }
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
    setIsPaused(false);
  }, []);

  const handleRestart = useCallback(() => {
    setIsNewHigh(false);
    setIsGameOver(false);
    setIsPaused(false);
    setGameStarted(true);
    engineRef.current?.setMotorcycle(selectedBike);
    engineRef.current?.startGame(currentMode);
  }, [currentMode, selectedBike]);

  const handleReturnToGarage = useCallback(() => {
    setIsGameOver(false);
    setIsPaused(false);
    setGameStarted(false);
    sounds.stopAll();
    if (engineRef.current) {
      engineRef.current.isRunning = false;
      engineRef.current.clearRemotePlayers();
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
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans select-none">
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {showIntro && (
        <div className="creator-intro fixed inset-0 z-[100] flex items-center justify-center overflow-hidden" aria-label="Created by Nidhin">
          <div className="intro-grid" />
          <div className="intro-orb intro-orb-one" />
          <div className="intro-orb intro-orb-two" />
          <div className="intro-light intro-light-one" />
          <div className="intro-light intro-light-two" />
          <div className="intro-content text-center">
            <div className="intro-line" />
            <p className="intro-caption">BUILT WITH PASSION</p>
            <h1 className="intro-name">NIDHIN</h1>
            <p className="intro-created">CREATED BY</p>
            <div className="intro-bottom-line" />
            <p className="intro-subtitle">TWO WHEELS. ONE JOURNEY.</p>
          </div>
          <div className="intro-corner intro-corner-tl" />
          <div className="intro-corner intro-corner-br" />
          <div className="intro-loader"><span /></div>
        </div>
      )}

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

      {!showIntro && !gameStarted && !isGameOver && (
        <>
          <StartScreen
            onStartGame={handleStartGame}
            highScore={highScore}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            selectedBike={selectedBike}
            onSelectBike={handleSelectBike}
          />

          <button
            onClick={() => setShowFriends((value) => !value)}
            className="fixed bottom-20 right-4 z-40 rounded-xl border border-emerald-300/50 bg-slate-950/95 px-4 py-3 font-bold text-white shadow-lg"
          >
            👥 Friends
          </button>

          <button
            onClick={() => setShowMultiplayer((value) => !value)}
            className="fixed bottom-5 right-4 z-40 rounded-xl border border-cyan-300/50 bg-slate-950/95 px-4 py-3 font-bold text-white shadow-lg"
          >
            {showMultiplayer ? 'Close Multiplayer' : '🌐 Multiplayer'}
          </button>

          {showMultiplayer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
              <div className="w-full max-w-md rounded-2xl border border-cyan-300/40 bg-slate-950 p-5 text-white shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold">Multiplayer</h2>
                  <button onClick={() => setShowMultiplayer(false)} className="rounded-lg bg-slate-800 px-3 py-2">✕</button>
                </div>

                <p className="mb-3 text-sm text-slate-300">Create a private room or join a friend. Maximum 4 players.</p>

                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      multiplayerModeRef.current = 'race';
                      setMultiplayerMode('race');
                    }}
                    className={`rounded-xl border p-3 font-bold ${multiplayerMode === 'race' ? 'border-cyan-300 bg-cyan-900/70' : 'border-slate-700 bg-slate-900'}`}
                  >
                    🏁 Friends Race
                  </button>
                  <button
                    onClick={() => {
                      multiplayerModeRef.current = 'free-ride';
                      setMultiplayerMode('free-ride');
                    }}
                    className={`rounded-xl border p-3 font-bold ${multiplayerMode === 'free-ride' ? 'border-cyan-300 bg-cyan-900/70' : 'border-slate-700 bg-slate-900'}`}
                  >
                    🌿 Free Ride
                  </button>
                </div>

                {!activeRoom ? (
                  <>
                    <button onClick={createRoom} disabled={isConnecting} className="mb-3 w-full rounded-xl bg-cyan-600 p-3 font-bold disabled:opacity-50">
                      {isConnecting ? 'Connecting...' : 'Create Private Room'}
                    </button>
                    <div className="my-3 text-center text-xs text-slate-400">OR JOIN FRIEND</div>
                    <input
                      value={roomCode}
                      onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                      placeholder="Enter room code"
                      maxLength={8}
                      className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-center text-lg uppercase tracking-[0.2em] text-white outline-none focus:border-cyan-300"
                    />
                    <button onClick={joinRoom} disabled={isConnecting} className="w-full rounded-xl bg-indigo-600 p-3 font-bold disabled:opacity-50">
                      Join Room
                    </button>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-emerald-400/40 bg-emerald-950/40 p-4 text-center">
                      <p className="text-sm text-emerald-200">ROOM CODE</p>
                      <p className="my-2 text-3xl font-black tracking-[0.25em]">{activeRoom}</p>
                      <button
                        onClick={() => {
                          if (navigator.clipboard?.writeText) {
                            navigator.clipboard.writeText(activeRoom)
                              .then(() => setMultiplayerMessage('Room code copied.'))
                              .catch(() => setMultiplayerMessage(`Share code: ${activeRoom}`));
                          } else setMultiplayerMessage(`Share code: ${activeRoom}`);
                        }}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold"
                      >
                        Copy Room Code
                      </button>
                      <p className="mt-3 text-sm">Players connected: {playerCount}/4</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">Close this panel and start the ride from the existing garage screen.</p>
                    <button onClick={leaveRoom} className="mt-4 w-full rounded-xl bg-red-700 p-3 font-bold">Leave Room</button>
                  </>
                )}

                {multiplayerMessage && <p className="mt-4 break-words text-center text-sm text-cyan-200" role="status">{multiplayerMessage}</p>}
              </div>
            </div>
          )}

          {showFriends && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3">
              <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-emerald-300/40 bg-slate-950 p-5 text-white shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold">👥 Friends</h2>
                  <button onClick={() => setShowFriends(false)} className="rounded-lg bg-slate-800 px-3 py-2">✕</button>
                </div>

                {!username ? (
                  <>
                    <p className="mb-3 text-sm text-slate-300">Set a username to use friends and room invites.</p>
                    <input
                      value={usernameInput}
                      onChange={(event) => setUsernameInput(event.target.value)}
                      placeholder="Choose username (3–16 chars)"
                      maxLength={16}
                      className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-emerald-300"
                    />
                    <button onClick={setMyUsername} disabled={isSettingUsername} className="w-full rounded-xl bg-emerald-600 p-3 font-bold disabled:opacity-50">
                      {isSettingUsername ? 'Connecting...' : 'Set Username'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-4 rounded-xl bg-slate-900 p-3">
                      <p className="text-xs text-slate-400">YOUR USERNAME</p>
                      <p className="text-lg font-bold text-emerald-300">{username}</p>
                    </div>

                    <div className="mb-5">
                      <h3 className="mb-2 font-bold">Add Friend</h3>
                      <div className="flex gap-2">
                        <input
                          value={friendInput}
                          onChange={(event) => setFriendInput(event.target.value)}
                          placeholder="Friend username"
                          maxLength={16}
                          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                        />
                        <button onClick={addFriend} className="rounded-xl bg-indigo-600 px-4 font-bold">Add</button>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">Friend request ayakkaan avar online aayirikkanam.</p>
                    </div>

                    <div className="mb-5">
                      <h3 className="mb-2 font-bold">Incoming Requests ({friendRequests.length})</h3>
                      {friendRequests.length === 0 ? (
                        <p className="text-sm text-slate-400">No incoming requests.</p>
                      ) : friendRequests.map((request) => (
                        <div key={request} className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-slate-900 p-3">
                          <span className="break-all">{request}</span>
                          <div className="flex gap-2">
                            <button onClick={() => respondToFriendRequest(request, true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold">Accept</button>
                            <button onClick={() => respondToFriendRequest(request, false)} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-bold">Decline</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mb-5">
                      <h3 className="mb-2 font-bold">My Friends ({friends.length})</h3>
                      {friends.length === 0 ? (
                        <p className="text-sm text-slate-400">Friends list empty.</p>
                      ) : friends.map((friend) => (
                        <div key={friend.username} className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-slate-900 p-3">
                          <div className="min-w-0">
                            <p className="break-all font-semibold">{friend.username}</p>
                            <p className={`text-xs ${friend.online ? 'text-emerald-300' : 'text-slate-500'}`}>{friend.online ? '● Online' : '○ Offline'}</p>
                          </div>
                          <button
                            disabled={!friend.online || !activeRoom}
                            onClick={() => inviteFriendToRoom(friend.username)}
                            className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-bold disabled:opacity-40"
                          >
                            Invite
                          </button>
                        </div>
                      ))}
                      {!activeRoom && friends.length > 0 && <p className="mt-2 text-xs text-slate-400">Invite button use cheyyaan Multiplayer-il room create/join cheyyu.</p>}
                    </div>

                    <div>
                      <h3 className="mb-2 font-bold">Room Invites ({roomInvites.length})</h3>
                      {roomInvites.length === 0 ? (
                        <p className="text-sm text-slate-400">No pending room invites.</p>
                      ) : roomInvites.map((invite) => (
                        <div key={invite.inviteId} className="mb-2 rounded-xl bg-slate-900 p-3">
                          <p className="mb-1 font-semibold">{invite.from} invited you</p>
                          <p className="mb-3 text-xs text-slate-400">Room {invite.roomCode} · {invite.mode}</p>
                          <div className="flex gap-2">
                            <button onClick={() => respondToRoomInvite(invite, true)} className="flex-1 rounded-lg bg-emerald-700 p-2 font-bold">Accept</button>
                            <button onClick={() => respondToRoomInvite(invite, false)} className="flex-1 rounded-lg bg-red-800 p-2 font-bold">Decline</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {friendsMessage && <p className="mt-4 break-words rounded-lg bg-slate-900 p-3 text-sm text-cyan-200" role="status">{friendsMessage}</p>}
              </div>
            </div>
          )}
        </>
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

      <style>{`
        .creator-intro {
          isolation: isolate;
          background: radial-gradient(ellipse at 50% 45%, #102e55 0%, #071323 42%, #02050c 78%, #000 100%);
          color: #fff;
          animation: introFadeOut 0.8s ease-in-out 4.2s forwards;
        }
        .intro-grid {
          position: absolute; inset: -50%; z-index: -1; opacity: .16;
          background-image: linear-gradient(rgba(67,163,255,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(67,163,255,.25) 1px, transparent 1px);
          background-size: 42px 42px;
          transform: perspective(500px) rotateX(58deg) scale(1.5);
          animation: introGridMove 5s linear infinite;
          mask-image: linear-gradient(transparent, #000 35%, #000 70%, transparent);
        }
        .intro-orb {
          position: absolute; width: min(65vw,360px); aspect-ratio: 1; border-radius: 50%;
          filter: blur(65px); opacity: 0; z-index: -1;
        }
        .intro-orb-one { background: #087bff; animation: orbAppear 3s ease-out .2s forwards; left: -20%; top: 10%; }
        .intro-orb-two { background: #00d5ff; animation: orbAppear 3s ease-out .8s forwards; right: -25%; bottom: 0; }
        .intro-light {
          position: absolute; width: 150%; height: 2px; left: -25%;
          background: linear-gradient(90deg, transparent, #39baff, #fff, #1678ff, transparent);
          box-shadow: 0 0 22px #168cff; opacity: 0; z-index: -1;
        }
        .intro-light-one { top: 35%; animation: lightSweep 2.3s ease-in-out .6s both; }
        .intro-light-two { top: 67%; animation: lightSweep 2s ease-in-out 1.4s both; }
        .intro-content { width: 100%; padding: 24px; animation: introContentIn 1.1s cubic-bezier(.2,.8,.2,1) both; }
        .intro-line, .intro-bottom-line {
          height: 2px; width: 0; margin: 0 auto;
          background: linear-gradient(90deg, transparent, #4bcaff, #fff, #4bcaff, transparent);
          box-shadow: 0 0 18px #159dff;
          animation: lineExpand .8s ease-out .3s forwards;
        }
        .intro-caption { margin: 23px 0 10px; font-size: 10px; letter-spacing: .48em; color: #8dcfff; opacity: 0; animation: textAppear .7s ease-out .65s forwards; }
        .intro-name {
          margin: 0; font-size: clamp(48px,13vw,104px); line-height: 1.1; font-weight: 900;
          letter-spacing: .12em; padding-left: .12em; color: #fff;
          text-shadow: 0 0 8px rgba(255,255,255,.9), 0 0 22px rgba(48,166,255,.9), 0 0 55px rgba(0,105,255,.75);
          opacity: 0; animation: nameReveal 1.1s cubic-bezier(.16,1,.3,1) .8s forwards;
        }
        .intro-created { margin: 12px 0 21px; font-size: 12px; font-weight: 600; letter-spacing: .65em; padding-left: .65em; color: #d6ecff; opacity: 0; animation: textAppear .8s ease-out 1.55s forwards; }
        .intro-bottom-line { animation-delay: 1.8s; }
        .intro-subtitle { margin-top: 18px; font-size: 9px; letter-spacing: .34em; color: #76baff; opacity: 0; animation: textAppear .8s ease-out 2s forwards; }
        .intro-corner { position: absolute; width: 28px; height: 28px; border-color: rgba(92,190,255,.8); opacity: 0; animation: textAppear .6s ease-out .5s forwards; }
        .intro-corner-tl { top: 22px; left: 22px; border-top: 1px solid; border-left: 1px solid; }
        .intro-corner-br { bottom: 22px; right: 22px; border-bottom: 1px solid; border-right: 1px solid; }
        .intro-loader { position: absolute; left: 50%; bottom: 12%; transform: translateX(-50%); width: min(180px,45vw); height: 2px; overflow: hidden; background: rgba(120,180,255,.18); }
        .intro-loader span { display: block; width: 0; height: 100%; background: #69d5ff; box-shadow: 0 0 12px #29aaff; animation: loaderFill 4.1s linear forwards; }
        @keyframes introFadeOut { to { opacity: 0; visibility: hidden; } }
        @keyframes introContentIn { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes nameReveal { from { opacity: 0; transform: scale(1.3); filter: blur(12px); } to { opacity: 1; transform: scale(1); filter: blur(0); } }
        @keyframes textAppear { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lineExpand { from { width: 0; } to { width: min(270px,70vw); } }
        @keyframes lightSweep { 0% { opacity: 0; transform: translateX(-35%) scaleX(.3); } 35% { opacity: .9; } 100% { opacity: 0; transform: translateX(35%) scaleX(1.1); } }
        @keyframes orbAppear { 0% { opacity: 0; transform: scale(.6); } 45% { opacity: .28; } 100% { opacity: .12; transform: scale(1.15); } }
        @keyframes introGridMove { from { background-position: 0 0; } to { background-position: 0 42px; } }
        @keyframes loaderFill { from { width: 0; } to { width: 100%; } }
        @media (prefers-reduced-motion: reduce) { .creator-intro *, .creator-intro { animation-duration: .01ms !important; } }
      `}</style>
    </div>
  );
}
