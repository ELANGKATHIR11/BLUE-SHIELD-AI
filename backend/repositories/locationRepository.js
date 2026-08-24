/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { db, admin } from '../config/firebase.js';

class LocationRepository {
  constructor() {
    this.collectionName = 'vesselLocations';
    this.inMemoryLocations = new Map();
  }

  get collection() {
    return db ? db.collection(this.collectionName) : null;
  }

  async recordLocation(locationRecord) {
    const timestamp = admin?.firestore?.FieldValue?.serverTimestamp?.() || new Date();
    const docData = {
      vesselId: locationRecord.vesselId || locationRecord.aisId,
      aisId: locationRecord.aisId,
      latitude: locationRecord.latitude,
      longitude: locationRecord.longitude,
      speed: locationRecord.speed || 0,
      heading: locationRecord.heading || 0,
      accuracy: locationRecord.accuracy || 1.0,
      source: locationRecord.source || 'GPS',
      clientTimestamp: locationRecord.clientTimestamp || Date.now(),
      createdAt: timestamp
    };

    const key = docData.vesselId || docData.aisId;
    if (!this.inMemoryLocations.has(key)) {
      this.inMemoryLocations.set(key, []);
    }
    this.inMemoryLocations.get(key).push({ id: `loc_${Date.now()}`, ...docData });

    if (this.collection) {
      try {
        const docRef = await this.collection.add(docData);
        return { id: docRef.id, ...docData };
      } catch (err) {
        // Fallback gracefully if ADC is offline
      }
    }

    return { id: `loc_${Date.now()}`, ...docData };
  }

  async getRecentHistory(aisId, limitPoints = 50) {
    if (this.collection) {
      try {
        const snapshot = await this.collection
          .where('aisId', '==', aisId)
          .orderBy('createdAt', 'desc')
          .limit(limitPoints)
          .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      } catch (err) {
        // Fallback to in-memory history
      }
    }
    return (this.inMemoryLocations.get(aisId) || []).slice(-limitPoints);
  }
}

export const locationRepository = new LocationRepository();
export default locationRepository;
