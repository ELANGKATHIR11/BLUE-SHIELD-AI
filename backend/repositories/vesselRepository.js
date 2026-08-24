/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { db, admin } from '../config/firebase.js';

class VesselRepository {
  constructor() {
    this.collectionName = 'vessels';
    this.inMemoryVessels = new Map();
  }

  get collection() {
    return db ? db.collection(this.collectionName) : null;
  }

  async findByAisId(aisId) {
    if (this.collection) {
      try {
        const doc = await this.collection.doc(aisId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (err) {}
    }
    return this.inMemoryVessels.get(aisId) || null;
  }

  async findByBoatId(boatId) {
    if (this.collection) {
      try {
        const snapshot = await this.collection.where('governmentBoatNumber', '==', boatId).limit(1).get();
        if (!snapshot.empty) return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      } catch (err) {}
    }
    for (const v of this.inMemoryVessels.values()) {
      if (v.governmentBoatNumber === boatId || v.boatId === boatId) return v;
    }
    return null;
  }

  async createOrUpdate(aisId, vesselData) {
    const timestamp = admin?.firestore?.FieldValue?.serverTimestamp?.() || new Date();

    const payload = {
      vesselId: aisId,
      aisId,
      governmentBoatNumber: vesselData.governmentBoatNumber || vesselData.boatId || 'UNKNOWN',
      boatId: vesselData.governmentBoatNumber || vesselData.boatId || 'UNKNOWN',
      ownerId: vesselData.ownerId || vesselData.fishermanName || 'ANONYMOUS',
      captainName: vesselData.captainName || vesselData.fishermanName || 'Captain',
      fishermanName: vesselData.captainName || vesselData.fishermanName || 'Captain',
      phone: vesselData.phone || vesselData.contactInfo || '',
      contactInfo: vesselData.phone || vesselData.contactInfo || '',
      vesselType: vesselData.vesselType || 'FISHING_TRAWLER',
      registrationStatus: vesselData.registrationStatus || 'ACTIVE',
      status: vesselData.status || 'safe',
      active: vesselData.active !== undefined ? vesselData.active : true,
      lastLocation: vesselData.location || vesselData.lastLocation || null,
      updatedAt: timestamp
    };

    this.inMemoryVessels.set(aisId, { aisId, ...payload });

    if (this.collection) {
      try {
        const docRef = this.collection.doc(aisId);
        await docRef.set(payload, { merge: true });
      } catch (err) {}
    }

    return { aisId, ...payload };
  }

  async updateStatus(aisId, status) {
    if (!this.collection) return;
    const docRef = this.collection.doc(aisId);
    await docRef.set({
      status,
      updatedAt: admin?.firestore?.FieldValue?.serverTimestamp?.() || new Date()
    }, { merge: true });
  }

  async getAllActive() {
    if (!this.collection) return [];
    const snapshot = await this.collection.where('active', '==', true).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async listAll() {
    if (!this.collection) return [];
    const snapshot = await this.collection.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

export const vesselRepository = new VesselRepository();
export default vesselRepository;
