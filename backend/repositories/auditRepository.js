/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { db, admin } from '../config/firebase.js';

class AuditRepository {
  constructor() {
    this.collectionName = 'auditLogs';
  }

  get collection() {
    return db ? db.collection(this.collectionName) : null;
  }

  async log(event) {
    if (!this.collection) return;
    const timestamp = admin?.firestore?.FieldValue?.serverTimestamp?.() || new Date();

    // Sanitize record to eliminate any undefined values for Firestore
    const sanitizedDetails = JSON.parse(JSON.stringify(event.details || {}, (key, value) => {
      return value === undefined ? null : value;
    }));

    const record = {
      action: event.action || 'UNKNOWN_ACTION',
      actor: event.actor || 'SYSTEM',
      role: event.role || 'SYSTEM',
      targetId: event.targetId || null,
      details: sanitizedDetails,
      ipAddress: event.ipAddress || null,
      createdAt: timestamp
    };

    try {
      await this.collection.add(record);
    } catch (err) {
      // Benign log note in offline test environments
    }
  }
}

export const auditRepository = new AuditRepository();
export default auditRepository;
