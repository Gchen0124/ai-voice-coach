const DB_NAME = "VoiceCoachDB";
const DB_VERSION = 2;
const STORE_AUDIO = "audioStore";
const STORE_SESSIONS = "sessionStore";

export interface StoredSession {
  id: string;
  userMessage: string;
  responses: {
    accent?: string;
    language?: string;
    executive?: string;
    ai: string;
  };
  timestamp: number;
  audioKey: string;
  fromLiveMode?: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO);
      }

      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: "id" });
        sessionStore.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

export async function saveAudioBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_AUDIO], "readwrite");
    const store = transaction.objectStore(STORE_AUDIO);
    const request = store.put(blob, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAudioBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_AUDIO], "readonly");
    const store = transaction.objectStore(STORE_AUDIO);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTTSAudio(text: string, voice: string, speed: number, blob: Blob): Promise<string> {
  const key = `tts-${btoa(text)}-${voice}-${speed}`;
  await saveAudioBlob(key, blob);
  return key;
}

export async function getTTSAudio(text: string, voice: string, speed: number): Promise<Blob | null> {
  const key = `tts-${btoa(text)}-${voice}-${speed}`;
  return getAudioBlob(key);
}

export async function saveSession(session: StoredSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESSIONS], "readwrite");
    const store = transaction.objectStore(STORE_SESSIONS);
    const request = store.put(session);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSession(id: string): Promise<StoredSession | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESSIONS], "readonly");
    const store = transaction.objectStore(STORE_SESSIONS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllSessions(): Promise<StoredSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESSIONS], "readonly");
    const store = transaction.objectStore(STORE_SESSIONS);
    const index = store.index("timestamp");
    const request = index.openCursor(null, "prev");

    const sessions: StoredSession[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        sessions.push(cursor.value);
        cursor.continue();
      } else {
        resolve(sessions);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESSIONS], "readwrite");
    const store = transaction.objectStore(STORE_SESSIONS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_AUDIO, STORE_SESSIONS], "readwrite");

    const audioStore = transaction.objectStore(STORE_AUDIO);
    const sessionStore = transaction.objectStore(STORE_SESSIONS);

    audioStore.clear();
    sessionStore.clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
