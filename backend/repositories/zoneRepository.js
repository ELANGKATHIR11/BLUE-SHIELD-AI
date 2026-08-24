/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { db, admin } from '../config/firebase.js';

class ZoneRepository {
  constructor() {
    this.collectionName = 'zones';
  }

  get collection() {
    return db ? db.collection(this.collectionName) : null;
  }

  async getAllZones() {
    if (!this.collection) return [];
    const snapshot = await this.collection.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findById(zoneId) {
    if (!this.collection) return null;
    const doc = await this.collection.doc(zoneId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async seedZoneIfMissing(zoneId, zoneData) {
    if (!this.collection) return;
    const docRef = this.collection.doc(zoneId);
    const existing = await docRef.get();
    if (!existing.exists) {
      await docRef.set({
        ...zoneData,
        createdAt: admin?.firestore?.FieldValue?.serverTimestamp?.() || new Date()
      });
    }
  }
}

export const zoneRepository = new ZoneRepository();
export default zoneRepository;
