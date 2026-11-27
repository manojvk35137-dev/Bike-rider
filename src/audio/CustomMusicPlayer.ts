
export type MusicTrack = {
  id: string;
  name: string;
  blob: Blob;
  addedAt: number;
};

const DB_NAME = 'BikeRiderMusicDB';
const STORE_NAME = 'tracks';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getMusicTracks(): Promise<MusicTrack[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .getAll();

    request.onsuccess = () => resolve(request.result as MusicTrack[]);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMusicFiles(files: FileList | File[]): Promise<MusicTrack[]> {
  const db = await openDB();
  const selectedFiles = Array.from(files);

  const tracks = selectedFiles
    .filter(file => file.type.startsWith('audio/'))
    .map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      blob: file,
      addedAt: Date.now()
    }));

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    tracks.forEach(track => store.put(track));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  return tracks;
}

export async function deleteMusicTrack(id: string): Promise<void> {
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export class CustomMusicPlayer {
  private audio = new Audio();
  private objectUrl: string | null = null;

  constructor() {
    this.audio.preload = 'auto';
    this.audio.loop = false;
    this.audio.volume = 0.7;
  }

  load(track: MusicTrack): void {
    this.stop();

    this.objectUrl = URL.createObjectURL(track.blob);
    this.audio.src = this.objectUrl;
    this.audio.load();
  }

  async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (error) {
      console.warn('Music playback could not start:', error);
    }
  }

  pause(): void {
    this.audio.pause();
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.removeAttribute('src');
    this.audio.load();

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  setVolume(value: number): void {
    this.audio.volume = Math.max(0, Math.min(1, value));
  }

  setOnEnded(callback: () => void): void {
    this.audio.onended = callback;
  }

  get isPlaying(): boolean {
    return !this.audio.paused;
  }

  dispose(): void {
    this.stop();
    this.audio.onended = null;
  }
}
