/**
 * Replay Service — GPS History for Vessel Playback
 *
 * Firestore collection: vessel_gps_history
 * Documents: { aisId, lat, lng, speed, heading, timestamp }
 * Writes are throttled to 1/minute per vessel (Spark plan safe).
 * Max 200 docs returned per replay load.
 */

import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, deleteDoc } from 'firebase/firestore';

export interface GPSHistoryPoint {
  aisId: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: number;
}

const HISTORY_COL = 'vessel_gps_history';

// Per-vessel last write timestamp (client-side throttle — 60s)
const lastWriteTime = new Map<string, number>();

/**
 * Store a GPS point in history (Spark-safe: 60s throttle per vessel).
 */
export async function storeGPSHistory(point: GPSHistoryPoint): Promise<void> {
  const now = Date.now();
  const last = lastWriteTime.get(point.aisId) ?? 0;
  if (now - last < 60_000) return; // Throttle: max 1 write/vessel/minute
  lastWriteTime.set(point.aisId, now);

  try {
    await addDoc(collection(db, HISTORY_COL), {
      ...point,
      recordedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('GPS history write failed:', e);
  }
}

/**
 * Get GPS history for a vessel (up to 200 points, ordered by timestamp).
 */
export async function getVesselHistory(aisId: string, maxPoints = 200): Promise<GPSHistoryPoint[]> {
  try {
    const q = query(
      collection(db, HISTORY_COL),
      where('aisId', '==', aisId),
      orderBy('timestamp', 'asc'),
      limit(maxPoints),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GPSHistoryPoint);
  } catch (e) {
    console.warn('GPS history fetch failed:', e);
    return [];
  }
}

/**
 * Delete all history for a vessel (e.g., after simulation ends).
 */
export async function deleteVesselHistory(aisId: string): Promise<void> {
  try {
    const q = query(collection(db, HISTORY_COL), where('aisId', '==', aisId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch (e) {
    console.warn('History delete failed:', e);
  }
}

/**
 * Get all unique AIS IDs that have history stored.
 */
export async function getAvailableHistoryVessels(): Promise<string[]> {
  try {
    const snap = await getDocs(query(collection(db, HISTORY_COL), limit(500)));
    const ids = new Set<string>();
    snap.docs.forEach(d => { const data = d.data(); if (data.aisId) ids.add(data.aisId); });
    return [...ids];
  } catch {
    return [];
  }
}
