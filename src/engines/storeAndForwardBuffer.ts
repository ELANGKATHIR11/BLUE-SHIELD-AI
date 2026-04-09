/**
 * Store-and-Forward Buffer
 * IndexedDB persistence for offline LoRa packet queuing.
 * Exponential backoff retry: 5s → 10s → 20s → 40s → 80s
 */

export interface BufferedPacket {
  id: string;
  packet: object;
  timestamp: number;
  retryCount: number;
  nextRetryAt: number;
  status: 'pending' | 'failed';
}

const DB_NAME = 'bs-lora-buffer';
const STORE = 'packets';
const MAX_RETRIES = 5;
const MAX_SIZE = 100;

// Memory fallback when IndexedDB unavailable
const mem: BufferedPacket[] = [];
let useMemory = false;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { useMemory = true; reject(req.error); };
  });
}

async function dbOp<T>(fn: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode = 'readonly'): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function bufferPacket(packet: object): Promise<string> {
  const id = `PKT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  const entry: BufferedPacket = { id, packet, timestamp: Date.now(), retryCount: 0, nextRetryAt: Date.now() + 5000, status: 'pending' };
  if (useMemory) {
    if (mem.length >= MAX_SIZE) mem.shift();
    mem.push(entry);
    return id;
  }
  try { await dbOp(s => s.add(entry), 'readwrite'); } catch { useMemory = true; mem.push(entry); }
  return id;
}

export async function getPendingPackets(): Promise<BufferedPacket[]> {
  const now = Date.now();
  if (useMemory) return mem.filter(p => p.status === 'pending' && p.nextRetryAt <= now);
  try {
    const all = await dbOp<BufferedPacket[]>(s => s.getAll());
    return all.filter(p => p.status === 'pending' && p.nextRetryAt <= now);
  } catch { return []; }
}

export async function markSent(id: string): Promise<void> {
  if (useMemory) { const i = mem.findIndex(p => p.id === id); if (i >= 0) mem.splice(i, 1); return; }
  try { await dbOp(s => s.delete(id), 'readwrite'); } catch { /* ignore */ }
}

export async function markRetry(id: string): Promise<void> {
  const update = (p: BufferedPacket) => {
    p.retryCount++;
    p.status = p.retryCount >= MAX_RETRIES ? 'failed' : 'pending';
    p.nextRetryAt = Date.now() + 5000 * Math.pow(2, p.retryCount);
  };
  if (useMemory) { const p = mem.find(p => p.id === id); if (p) update(p); return; }
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => { const p = req.result; if (p) { update(p); store.put(p); } };
    await new Promise<void>((res, rej) => { tx.oncomplete = () => { db.close(); res(); }; tx.onerror = rej; });
  } catch { /* ignore */ }
}

export async function getBufferStats(): Promise<{ pending: number; failed: number; total: number }> {
  if (useMemory) return { pending: mem.filter(p => p.status === 'pending').length, failed: mem.filter(p => p.status === 'failed').length, total: mem.length };
  try {
    const all = await dbOp<BufferedPacket[]>(s => s.getAll());
    return { pending: all.filter(p => p.status === 'pending').length, failed: all.filter(p => p.status === 'failed').length, total: all.length };
  } catch { return { pending: 0, failed: 0, total: 0 }; }
}

export async function clearBuffer(): Promise<void> {
  if (useMemory) { mem.length = 0; return; }
  try { await dbOp(s => s.clear(), 'readwrite'); } catch { /* ignore */ }
}
