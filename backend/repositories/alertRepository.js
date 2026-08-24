/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { db, admin } from '../config/firebase.js';

class AlertRepository {
  constructor() {
    this.collectionName = 'alerts';
    this.inMemoryCache = new Map();
  }

  get collection() {
    return db ? db.collection(this.collectionName) : null;
  }

  async create(alertData) {
    const timestamp = admin?.firestore?.FieldValue?.serverTimestamp?.() || new Date();
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const record = {
      id,
      vesselId: alertData.vesselId || alertData.aisId,
      aisId: alertData.aisId,
      type: alertData.type || 'ZONE_APPROACH',
      severity: alertData.severity || 'MEDIUM',
      message: alertData.message,
      latitude: alertData.latitude || null,
      longitude: alertData.longitude || null,
      zoneId: alertData.zoneId || null,
      status: alertData.status || 'ACTIVE',
      acknowledged: alertData.acknowledged || false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      source: alertData.source || 'GEOSPATIAL_ENGINE',
      createdAt: timestamp,
      createdTimestamp: Date.now()
    };

    // Cache in-memory for immediate deduplication
    const cacheKey = `${alertData.aisId}_${record.type}`;
    this.inMemoryCache.set(cacheKey, record);

    if (this.collection) {
      try {
        const docRef = await this.collection.add(record);
        return { id: docRef.id, ...record };
      } catch (err) {
        // Fallback to in-memory for offline / local test runs without GCP ADC credentials
        return record;
      }
    }

    return record;
  }

  async getRecentAlertForVesselAndType(aisId, type, cooldownMs = 60000) {
    const cacheKey = `${aisId}_${type}`;
    const cached = this.inMemoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.createdTimestamp) < cooldownMs) {
      return cached;
    }

    if (!this.collection) return null;
    const cutoffDate = new Date(Date.now() - cooldownMs);

    try {
      const snapshot = await this.collection
        .where('aisId', '==', aisId)
        .where('type', '==', type)
        .where('createdAt', '>=', cutoffDate)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch {
      return null;
    }
  }

  async getUnacknowledged(severity) {
    if (!this.collection) return [];
    try {
      let q = this.collection.where('acknowledged', '==', false);
      if (severity) {
        q = q.where('severity', '==', severity);
      }
      const snapshot = await q.orderBy('createdAt', 'desc').limit(100).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch {
      return [];
    }
  }

  async acknowledge(alertId, acknowledgedBy = 'Coast Guard Officer') {
    if (!this.collection) return;
    try {
      const docRef = this.collection.doc(alertId);
      await docRef.set({
        acknowledged: true,
        acknowledgedAt: admin?.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
        acknowledgedBy,
        status: 'ACKNOWLEDGED'
      }, { merge: true });
    } catch (err) {
      console.warn('Alert acknowledge in-memory fallback:', err.message);
    }
  }

  async getVesselAlerts(aisId, limitCount = 50) {
    if (!this.collection) return [];
    try {
      const snapshot = await this.collection
        .where('aisId', '==', aisId)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch {
      return [];
    }
  }
}

export const alertRepository = new AlertRepository();
export default alertRepository;
