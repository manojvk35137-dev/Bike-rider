
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { sounds } from './SoundEffects';
import { RoyalEnfieldIntro } from './RoyalEnfieldIntro';

import { GameOverModal } from '../../GameOverModal';
import { HUD } from '../../HUD';
import { PauseModal } from '../../PauseModal';
import { StartScreen } from '../../StartScreen';

import { GameMode, GameStats } from '../../constants';
import { GameEngine, InputState } from '../../GameEngine';
import { MOTORCYCLE_REGISTRY, MotorcycleConfig } from '../../motorcycles';

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

type MusicTrack = {
  id: string;
  name: string;
  blob: Blob;
};

const MUSIC_DB_NAME = 'BikeRiderMusicDB';
const MUSIC_STORE_NAME = 'tracks';

function openMusicDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Music storage is not supported.'));
      return;
    }

    const request = indexedDB.open(MUSIC_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MUSIC_STORE_NAME)) {
        db.createObjectStore(MUSIC_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveMusicTrack(track: MusicTrack): Promise<void> {
  const db = await openMusicDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MUSIC_STORE_NAME, 'readwrite');
    transaction.objectStore(MUSIC_STORE_NAME).put(track);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getSavedMusic(): Promise<MusicTrack[]> {
  const db = await openMusicDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MUSIC_STORE_NAME, 'readonly');
    const request = transaction.objectStore(MUSIC_STORE_NAME).getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result as MusicTrack[]);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function deleteSavedMusic(id: string): Promise<void> {
  const db = await openMusicDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MUSIC_STORE_NAME, 'readwrite');
    transaction.objectStore(MUSIC_STORE_NAME).delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function makeMusicId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef('');
  const multiplayerModeRef = useRef<MultiplayerMode>('race');
  const pendingUsernameRef = useRef('');

  // Music player refs
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicUrlsRef = useRef<string[]>([]);
  const musicTracksRef = useRef<MusicTrack[]>([]);
  const currentMusicIndexRef = useRef(0);
  const musicFileInputRef = useRef<HTMLInputElement>(null);

  // Audio gain and draggable panel refs
  const musicAudioContextRef = useRef<AudioContext | null>(null);
  const musicPanelRef = useRef<HTMLDivElement>(null);
  const musicDragRef = useRef<{ x: number; y: number } | null>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [selectedBike, setSelectedBike] =
    useState<MotorcycleConfig>(MOTORCYCLE_REGISTRY[0]);
  const [currentMode, setCurrentMode] = useState<GameMode>('one-way');

  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Music state
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.75);
  const [musicMessage, setMusicMessage] = useState('');

  // Saved draggable music panel position
  const [musicPosition, setMusicPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('bike_music_position');
      if (saved) {
        const position = JSON.parse(saved);
        if (
          Number.isFinite(position?.x) &&
          Number.isFinite(position?.y)
        ) {
          return { x: position.x, y: position.y };
        }
      }
    } catch {
      // Use default position.
    }

    return {
      x: 8,
      y: Math.max(8, window.innerHeight - 115),
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'bike_music_position',
        JSON.stringify(musicPosition)
      );
    } catch {
      // Position storage may be unavailable.
    }
  }, [musicPosition]);

  const resumeMusicAudio = useCallback(async () => {
    const context = musicAudioContextRef.current;

    if (context?.state === 'suspended') {
      try {
        await context.resume();
      } catch (error) {
        console.error('Could not resume music audio:', error);
      }
    }
  }, []);

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
    musicTracksRef.current = musicTracks;
  }, [musicTracks]);

  useEffect(() => {
    currentMusicIndexRef.current = currentMusicIndex;
  }, [currentMusicIndex]);

  // Create audio player, add audio gain and restore saved music.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = musicVolume;
    musicAudioRef.current = audio;

    try {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();

      // Increase music output gain.
      gain.gain.value = 1.8;

      source.connect(gain);
      gain.connect(context.destination);

      musicAudioContextRef.current = context;
    } catch (error) {
      console.error('Audio gain setup failed:', error);
    }

    const handleEnded = () => {
      const urls = musicUrlsRef.current;

      if (urls.length > 1) {
        const nextIndex =
          (currentMusicIndexRef.current + 1) % urls.length;

        currentMusicIndexRef.current = nextIndex;
        setCurrentMusicIndex(nextIndex);
        audio.src = urls[nextIndex];

        audio.play().then(() => {
          setIsMusicPlaying(true);
        }).catch(() => {
          setIsMusicPlaying(false);
          setMusicMessage('Tap Play to continue music.');
        });
      } else if (urls.length === 1) {
        audio.currentTime = 0;
        audio.play().catch(() => setIsMusicPlaying(false));
      }
    };

    audio.addEventListener('ended', handleEnded);

    let cancelled = false;

    const restoreMusic = async () => {
      try {
        const savedTracks = await getSavedMusic();
        if (cancelled) return;

        if (savedTracks.length > 0 && musicTracksRef.current.length === 0) {
          const urls = savedTracks.map((track) =>
            URL.createObjectURL(track.blob)
          );

          musicTracksRef.current = savedTracks;
          musicUrlsRef.current = urls;

          setMusicTracks(savedTracks);
          setCurrentMusicIndex(0);
          currentMusicIndexRef.current = 0;

          audio.src = urls[0];
          audio.load();

          setMusicMessage('Saved music restored. Tap Play to listen.');
        }
      } catch (error) {
        console.error('Could not restore music:', error);
        setMusicMessage('Could not load saved music.');
      }
    };

    void restoreMusic();

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      musicUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      musicUrlsRef.current = [];
      musicAudioRef.current = null;

      if (musicAudioContextRef.current) {
        void musicAudioContextRef.current.close();
        musicAudioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  // Keep the music panel inside the visible screen after resizing.
  useEffect(() => {
    const handleResize = () => {
      const panel = musicPanelRef.current;
      if (!panel) return;

      setMusicPosition((previous) => ({
        x: Math.max(
          0,
          Math.min(window.innerWidth - panel.offsetWidth, previous.x)
        ),
        y: Math.max(
          0,
          Math.min(window.innerHeight - panel.offsetHeight, previous.y)
        ),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMusicUpload = useCallback(async (file: File) => {
    if (
      !file.type.startsWith('audio/') &&
      !/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)
    ) {
      setMusicMessage('Please select a valid audio file.');
      return;
    }

    const audio = musicAudioRef.current;
    if (!audio) {
      setMusicMessage('Music player is not ready. Try again.');
      return;
    }

    const track: MusicTrack = {
      id: makeMusicId(),
      name: file.name,
      blob: file,
    };

    const url = URL.createObjectURL(file);
    const nextTracks = [...musicTracksRef.current, track];
    const nextUrls = [...musicUrlsRef.current, url];
    const nextIndex = nextTracks.length - 1;

    musicTracksRef.current = nextTracks;
    musicUrlsRef.current = nextUrls;
    currentMusicIndexRef.current = nextIndex;

    setMusicTracks(nextTracks);
    setCurrentMusicIndex(nextIndex);

    audio.pause();
    audio.src = url;
    audio.load();
    audio.volume = musicVolume;

    try {
      await resumeMusicAudio();
      await audio.play();
      setIsMusicPlaying(true);
      setMusicMessage(`Now playing: ${file.name}`);
    } catch (error) {
      console.error('Music playback error:', error);
      setIsMusicPlaying(false);
      setMusicMessage('Music loaded. Tap Play to start.');
    }

    try {
      await saveMusicTrack(track);
    } catch (error) {
      console.error('Could not save music:', error);
      setMusicMessage('Music can play, but could not be saved for next time.');
    }
  }, [musicVolume, resumeMusicAudio]);

  const handleMusicPlayPause = useCallback(async () => {
    const audio = musicAudioRef.current;
    if (!audio) return;

    if (audio.paused) {
      if (!audio.src && musicUrlsRef.current.length > 0) {
        audio.src =
          musicUrlsRef.current[currentMusicIndexRef.current] ||
          musicUrlsRef.current[0];
      }

      if (!audio.src) {
        setMusicMessage('Choose a music file first.');
        musicFileInputRef.current?.click();
        return;
      }

      try {
        await resumeMusicAudio();
        await audio.play();
        setIsMusicPlaying(true);
        setMusicMessage('Music playing.');
      } catch (error) {
        console.error('Play failed:', error);
        setMusicMessage('Could not play this file. Try another audio file.');
        setIsMusicPlaying(false);
      }
    } else {
      audio.pause();
      setIsMusicPlaying(false);
      setMusicMessage('Music paused.');
    }
  }, [resumeMusicAudio]);

  const handleMusicNext = useCallback(async () => {
    const urls = musicUrlsRef.current;
    const audio = musicAudioRef.current;

    if (!audio || urls.length === 0) return;

    const nextIndex =
      (currentMusicIndexRef.current + 1) % urls.length;

    currentMusicIndexRef.current = nextIndex;
    setCurrentMusicIndex(nextIndex);

    audio.src = urls[nextIndex];

    try {
      await resumeMusicAudio();
      await audio.play();
      setIsMusicPlaying(true);
      setMusicMessage(
        `Now playing: ${musicTracksRef.current[nextIndex]?.name || 'Music'}`
      );
    } catch {
      setIsMusicPlaying(false);
      setMusicMessage('Tap Play to start this track.');
    }
  }, [resumeMusicAudio]);

  const handleMusicPrevious = useCallback(async () => {
    const urls = musicUrlsRef.current;
    const audio = musicAudioRef.current;

    if (!audio || urls.length === 0) return;

    const previousIndex =
      (currentMusicIndexRef.current - 1 + urls.length) % urls.length;

    currentMusicIndexRef.current = previousIndex;
    setCurrentMusicIndex(previousIndex);

    audio.src = urls[previousIndex];

    try {
      await resumeMusicAudio();
      await audio.play();
      setIsMusicPlaying(true);
      setMusicMessage(
        `Now playing: ${musicTracksRef.current[previousIndex]?.name || 'Music'}`
      );
    } catch {
      setIsMusicPlaying(false);
      setMusicMessage('Tap Play to start this track.');
    }
  }, [resumeMusicAudio]);

  const handleMusicDelete = useCallback(async () => {
    const index = currentMusicIndexRef.current;
    const track = musicTracksRef.current[index];
    if (!track) return;

    const audio = musicAudioRef.current;

    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    const oldUrl = musicUrlsRef.current[index];
    if (oldUrl) URL.revokeObjectURL(oldUrl);

    const nextTracks = musicTracksRef.current.filter((_, i) => i !== index);
    const nextUrls = musicUrlsRef.current.filter((_, i) => i !== index);

    musicTracksRef.current = nextTracks;
    musicUrlsRef.current = nextUrls;

    setMusicTracks(nextTracks);
    setIsMusicPlaying(false);

    try {
      await deleteSavedMusic(track.id);
    } catch (error) {
      console.error('Could not delete saved track:', error);
    }

    if (nextTracks.length > 0 && audio) {
      const newIndex = Math.min(index, nextTracks.length - 1);
      currentMusicIndexRef.current = newIndex;
      setCurrentMusicIndex(newIndex);
      audio.src = nextUrls[newIndex];
      audio.load();
      setMusicMessage('Track removed. Tap Play for the next track.');
    } else {
      currentMusicIndexRef.current = 0;
      setCurrentMusicIndex(0);
      setMusicMessage('Music removed.');
    }
  }, []);

  const handleIntroStart = useCallback(() => {
    setShowIntro(false);

    const audio = musicAudioRef.current;
    if (audio && audio.src) {
      void resumeMusicAudio().then(() => {
        audio.play().then(() => {
          setIsMusicPlaying(true);
        }).catch(() => {
          setIsMusicPlaying(false);
          setMusicMessage('Tap Play to start music.');
        });
      });
    }
  }, [resumeMusicAudio]);

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

      if (pendingUsernameRef.current) {
        socket.emit(
          'setUsername',
          pendingUsernameRef.current,
          (result: ServerAck) => {
            if (result?.success && result.username) {
              setUsername(result.username);
              setUsernameInput(result.username);
            } else if (result?.error) {
              setFriendsMessage(result.error);
            }
          }
        );
      }
    });

    socket.on('connect_error', () => {
      setMultiplayerMessage(
        'Connection failed. Please try again in a moment.'
      );
      setFriendsMessage('Could not connect to multiplayer server.');
      setIsConnecting(false);
      setIsSettingUsername(false);
    });

    socket.on('playerJoined', (data: { playerCount?: number }) => {
      if (typeof data?.playerCount === 'number') {
        setPlayerCount(data.playerCount);
      }
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

      if (
        !engine ||
        !engine.isRunning ||
        engine.isPaused ||
        !socket.connected
      ) return;

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

      socket.emit(
        'createRoom',
        { roomCode: code, mode: multiplayerModeRef.current },
        (result: ServerAck) => {
          setIsConnecting(false);

          if (!result?.success || !result.roomCode) {
            setMultiplayerMessage(result?.error || 'Could not create room.');
            return;
          }

          activeRoomRef.current = result.roomCode;
          setActiveRoom(result.roomCode);
          setRoomCode(result.roomCode);
          setPlayerCount(1);
          setMultiplayerMessage(
            `Room ${result.roomCode} created. Share the code with friends.`
          );
        }
      );
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
      setMultiplayerMessage(
        'Enter a valid room code (4–8 letters/numbers).'
      );
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
      setFriendsMessage(
        'Username must be 3–16 letters, numbers or underscores.'
      );
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
      setFriendsMessage(
        result?.success
          ? result.message || 'Friend request sent.'
          : result?.error || 'Could not send request.'
      );

      if (result?.success) setFriendInput('');
    });
  }, [friendInput, getSocket, username]);

  const respondToFriendRequest = useCallback(
    (requestUsername: string, accept: boolean) => {
      const socket = socketRef.current;

      if (!socket?.connected) {
        setFriendsMessage('Server is not connected.');
        return;
      }

      socket.emit(
        'respondFriendRequest',
        { username: requestUsername, accept },
        (result: ServerAck) => {
          setFriendsMessage(
            result?.success
              ? accept
                ? `${requestUsername} is now your friend!`
                : 'Request declined.'
              : result?.error || 'Could not process request.'
          );
        }
      );
    },
    []
  );

  const inviteFriendToRoom = useCallback((friendUsername: string) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setFriendsMessage('Server is not connected.');
      return;
    }

    socket.emit(
      'inviteToRoom',
      { username: friendUsername },
      (result: ServerAck) => {
        setFriendsMessage(
          result?.success
            ? result.message || `Invite sent to ${friendUsername}.`
            : result?.error || 'Could not send invite.'
        );
      }
    );
  }, []);

  const respondToRoomInvite = useCallback(
    (invite: RoomInvite, accept: boolean) => {
      const socket = getSocket();

      socket.emit(
        'respondRoomInvite',
        { inviteId: invite.inviteId, accept },
        (result: ServerAck) => {
          setRoomInvites((previous) =>
            previous.filter((item) => item.inviteId !== invite.inviteId)
          );

          if (!result?.success) {
            setFriendsMessage(
              result?.error || 'Could not process room invite.'
            );
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
          setFriendsMessage(
            `Joined ${invite.from}'s room: ${result.roomCode}`
          );
        }
      );
    },
    [getSocket]
  );

  const handleSelectBike = useCallback((bike: MotorcycleConfig) => {
    setSelectedBike(bike);
    engineRef.current?.setMotorcycle(bike);
  }, []);

  const handleStartGame = useCallback(
    (mode: GameMode, bike: MotorcycleConfig) => {
      setCurrentMode(mode);
      setSelectedBike(bike);
      setIsNewHigh(false);
      setIsGameOver(false);
      setIsPaused(false);
      setGameStarted(true);
      engineRef.current?.setMotorcycle(bike);
      engineRef.current?.startGame(mode);
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

  const currentTrackName =
    musicTracks[currentMusicIndex]?.name || 'No music selected';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans select-none">
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Intro screen - unchanged */}
      {showIntro && (
        <RoyalEnfieldIntro
          onStart={handleIntroStart}
          onChooseMusic={(file) => {
            void handleMusicUpload(file);
          }}
        />
      )}

      {/* Hidden music file input */}
      <input
        ref={musicFileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleMusicUpload(file);
          event.target.value = '';
        }}
      />

      {/* Draggable Royal Enfield Music Player */}
      {!showIntro && (
        <div
          ref={musicPanelRef}
          style={{
            left: musicPosition.x,
            top: musicPosition.y,
          }}
          className="fixed z-[80] w-[210px] max-w-[calc(100vw-16px)] rounded-xl border border-amber-500/40 bg-[#080808]/95 p-2 text-white shadow-lg backdrop-blur-md"
        >
          <div
            className="mb-1 flex min-w-0 cursor-move touch-none select-none items-center gap-1.5"
            onPointerDown={(event) => {
              const rect = musicPanelRef.current?.getBoundingClientRect();
              if (!rect) return;

              musicDragRef.current = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
              };

              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!musicDragRef.current || !musicPanelRef.current) return;

              const panel = musicPanelRef.current;
              const width = panel.offsetWidth;
              const height = panel.offsetHeight;

              setMusicPosition({
                x: Math.max(
                  0,
                  Math.min(
                    window.innerWidth - width,
                    event.clientX - musicDragRef.current.x
                  )
                ),
                y: Math.max(
                  0,
                  Math.min(
                    window.innerHeight - height,
                    event.clientY - musicDragRef.current.y
                  )
                ),
              });
            }}
            onPointerUp={() => {
              musicDragRef.current = null;
            }}
            onPointerCancel={() => {
              musicDragRef.current = null;
            }}
          >
            <span className="text-sm text-amber-400">♫</span>
            <p className="min-w-0 flex-1 truncate text-[10px] font-bold tracking-wide text-amber-200">
              {currentTrackName}
            </p>
            <span className="text-[9px] text-amber-500">RE MUSIC</span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={handleMusicPrevious}
              disabled={musicTracks.length === 0}
              className="h-7 w-7 rounded-md border border-amber-500/20 bg-zinc-900 text-xs text-amber-200 disabled:opacity-40"
              aria-label="Previous track"
            >
              ⏮
            </button>

            <button
              type="button"
              onClick={handleMusicPlayPause}
              className="h-7 min-w-12 rounded-md border border-amber-500/40 bg-amber-700 px-2 text-xs font-bold text-white"
              aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
            >
              {isMusicPlaying ? 'Ⅱ' : '▶'}
            </button>

            <button
              type="button"
              onClick={handleMusicNext}
              disabled={musicTracks.length === 0}
              className="h-7 w-7 rounded-md border border-amber-500/20 bg-zinc-900 text-xs text-amber-200 disabled:opacity-40"
              aria-label="Next track"
            >
              ⏭
            </button>

            <button
              type="button"
              onClick={() => musicFileInputRef.current?.click()}
              className="h-7 rounded-md border border-amber-500/30 bg-zinc-900 px-2 text-[10px] font-bold text-amber-200"
            >
              + ADD
            </button>

            <button
              type="button"
              onClick={handleMusicDelete}
              disabled={musicTracks.length === 0}
              className="h-7 w-7 rounded-md bg-zinc-900 text-xs text-red-400 disabled:opacity-40"
              aria-label="Delete current track"
            >
              🗑
            </button>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span className="text-[10px] text-amber-400">VOL</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(event) =>
                setMusicVolume(Number(event.target.value))
              }
              className="h-3 min-w-0 flex-1 accent-amber-500"
              aria-label="Music volume"
            />
          </div>

          {musicMessage && (
            <p className="mt-1 truncate text-[9px] text-zinc-400">
              {musicMessage}
            </p>
          )}
        </div>
      )}

      {/* Game HUD */}
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

      {/* Garage */}
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
                  <button
                    onClick={() => setShowMultiplayer(false)}
                    className="rounded-lg bg-slate-800 px-3 py-2"
                  >
                    ✕
                  </button>
                </div>

                <p className="mb-3 text-sm text-slate-300">
                  Create a private room or join a friend. Maximum 4 players.
                </p>

                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      multiplayerModeRef.current = 'race';
                      setMultiplayerMode('race');
                    }}
                    className={`rounded-xl border p-3 font-bold ${
                      multiplayerMode === 'race'
                        ? 'border-cyan-300 bg-cyan-900/70'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    🏁 Friends Race
                  </button>

                  <button
                    onClick={() => {
                      multiplayerModeRef.current = 'free-ride';
                      setMultiplayerMode('free-ride');
                    }}
                    className={`rounded-xl border p-3 font-bold ${
                      multiplayerMode === 'free-ride'
                        ? 'border-cyan-300 bg-cyan-900/70'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    🌿 Free Ride
                  </button>
                </div>

                {!activeRoom ? (
                  <>
                    <button
                      onClick={createRoom}
                      disabled={isConnecting}
                      className="mb-3 w-full rounded-xl bg-cyan-600 p-3 font-bold disabled:opacity-50"
                    >
                      {isConnecting ? 'Connecting...' : 'Create Private Room'}
                    </button>

                    <div className="my-3 text-center text-xs text-slate-400">
                      OR JOIN FRIEND
                    </div>

                    <input
                      value={roomCode}
                      onChange={(event) =>
                        setRoomCode(
                          event.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, '')
                            .slice(0, 8)
                        )
                      }
                      placeholder="Enter room code"
                      maxLength={8}
                      className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-center text-lg uppercase tracking-[0.2em] text-white outline-none focus:border-cyan-300"
                    />

                    <button
                      onClick={joinRoom}
                      disabled={isConnecting}
                      className="w-full rounded-xl bg-indigo-600 p-3 font-bold disabled:opacity-50"
                    >
                      Join Room
                    </button>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-emerald-400/40 bg-emerald-950/40 p-4 text-center">
                      <p className="text-sm text-emerald-200">ROOM CODE</p>
                      <p className="my-2 text-3xl font-black tracking-[0.25em]">
                        {activeRoom}
                      </p>

                      <button
                        onClick={() => {
                          if (navigator.clipboard?.writeText) {
                            navigator.clipboard
                              .writeText(activeRoom)
                              .then(() =>
                                setMultiplayerMessage('Room code copied.')
                              )
                              .catch(() =>
                                setMultiplayerMessage(
                                  `Share code: ${activeRoom}`
                                )
                              );
                          } else {
                            setMultiplayerMessage(
                              `Share code: ${activeRoom}`
                            );
                          }
                        }}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold"
                      >
                        Copy Room Code
                      </button>

                      <p className="mt-3 text-sm">
                        Players connected: {playerCount}/4
                      </p>
                    </div>

                    <p className="mt-3 text-sm text-slate-300">
                      Close this panel and start the ride from the existing garage screen.
                    </p>

                    <button
                      onClick={leaveRoom}
                      className="mt-4 w-full rounded-xl bg-red-700 p-3 font-bold"
                    >
                      Leave Room
                    </button>
                  </>
                )}

                {multiplayerMessage && (
                  <p
                    className="mt-4 break-words text-center text-sm text-cyan-200"
                    role="status"
                  >
                    {multiplayerMessage}
                  </p>
                )}
              </div>
            </div>
          )}

          {showFriends && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3">
              <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-emerald-300/40 bg-slate-950 p-5 text-white shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold">👥 Friends</h2>
                  <button
                    onClick={() => setShowFriends(false)}
                    className="rounded-lg bg-slate-800 px-3 py-2"
                  >
                    ✕
                  </button>
                </div>

                {!username ? (
                  <>
                    <p className="mb-3 text-sm text-slate-300">
                      Set a username to use friends and room invites.
                    </p>

                    <input
                      value={usernameInput}
                      onChange={(event) =>
                        setUsernameInput(event.target.value)
                      }
                      placeholder="Choose username (3–16 chars)"
                      maxLength={16}
                      className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-emerald-300"
                    />

                    <button
                      onClick={setMyUsername}
                      disabled={isSettingUsername}
                      className="w-full rounded-xl bg-emerald-600 p-3 font-bold disabled:opacity-50"
                    >
                      {isSettingUsername ? 'Connecting...' : 'Set Username'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-4 rounded-xl bg-slate-900 p-3">
                      <p className="text-xs text-slate-400">YOUR USERNAME</p>
                      <p className="text-lg font-bold text-emerald-300">
                        {username}
                      </p>
                    </div>

                    <div className="mb-5">
                      <h3 className="mb-2 font-bold">Add Friend</h3>

                      <div className="flex gap-2">
                        <input
                          value={friendInput}
                          onChange={(event) =>
                            setFriendInput(event.target.value)
                          }
                          placeholder="Friend username"
                          maxLength={16}
                          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                        />

                        <button
                          onClick={addFriend}
                          className="rounded-xl bg-indigo-600 px-4 font-bold"
                        >
                          Add
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Friend request ayakkaan avar online aayirikkanam.
                      </p>
                    </div>

                    <div className="mb-5">
                      <h3 className="mb-2 font-bold">
                        Incoming Requests ({friendRequests.length})
                      </h3>

                      {friendRequests.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          No incoming requests.
                        </p>
                      ) : (
                        friendRequests.map((request) => (
                          <div
                            key={request}
                            className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-slate-900 p-3"
                          >
                            <span className="break-all">{request}</span>

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  respondToFriendRequest(request, true)
                                }
                                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold"
                              >
                                Accept
                              </button>

                              <button
                                onClick={() =>
                                  respondToFriendRequest(request, false)
                                }
                                className="rounded-lg bg-red-800 px-3 py-2 text-sm font-bold"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mb-5">
                      <h3 className="mb-2 font-bold">
                        My Friends ({friends.length})
                      </h3>

                      {friends.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          Friends list empty.
                        </p>
                      ) : (
                        friends.map((friend) => (
                          <div
                            key={friend.username}
                            className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-slate-900 p-3"
                          >
                            <div className="min-w-0">
                              <p className="break-all font-semibold">
                                {friend.username}
                              </p>

                              <p
                                className={`text-xs ${
                                  friend.online
                                    ? 'text-emerald-300'
                                    : 'text-slate-500'
                                }`}
                              >
                                {friend.online ? '● Online' : '○ Offline'}
                              </p>
                            </div>

                            <button
                              disabled={!friend.online || !activeRoom}
                              onClick={() =>
                                inviteFriendToRoom(friend.username)
                              }
                              className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-bold disabled:opacity-40"
                            >
                              Invite
                            </button>
                          </div>
                        ))
                      )}

                      {!activeRoom && friends.length > 0 && (
                        <p className="mt-2 text-xs text-slate-400">
                          Invite button use cheyyaan Multiplayer-il room create/join cheyyu.
                        </p>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-2 font-bold">
                        Room Invites ({roomInvites.length})
                      </h3>

                      {roomInvites.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          No pending room invites.
                        </p>
                      ) : (
                        roomInvites.map((invite) => (
                          <div
                            key={invite.inviteId}
                            className="mb-2 rounded-xl bg-slate-900 p-3"
                          >
                            <p className="mb-1 font-semibold">
                              {invite.from} invited you
                            </p>

                            <p className="mb-3 text-xs text-slate-400">
                              Room {invite.roomCode} · {invite.mode}
                            </p>

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  respondToRoomInvite(invite, true)
                                }
                                className="flex-1 rounded-lg bg-emerald-700 p-2 font-bold"
                              >
                                Accept
                              </button>

                              <button
                                onClick={() =>
                                  respondToRoomInvite(invite, false)
                                }
                                className="flex-1 rounded-lg bg-red-800 p-2 font-bold"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {friendsMessage && (
                  <p
                    className="mt-4 break-words rounded-lg bg-slate-900 p-3 text-sm text-cyan-200"
                    role="status"
                  >
                    {friendsMessage}
                  </p>
                )}
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
    </div>
  );
}
