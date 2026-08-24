/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { db, admin } from '../config/firebase.js';

class PredictionRepository {
  constructor() {
    this.collectionName = 'aiPredictions';
  }

  get collection() {
    return db ? db.collection(this.collectionName) : null;
  }

  async recordPrediction(predictionData) {
    if (!this.collection) return predictionData;
    const timestamp = admin?.firestore?.FieldValue?.serverTimestamp?.() || new Date();

    const record = {
      aisId: predictionData.aisId,
      vesselId: predictionData.vesselId || predictionData.aisId,
      predictionType: predictionData.predictionType || 'TRAJECTORY_RISK',
      riskScore: predictionData.riskScore || 0,
      predictedBreach: predictionData.predictedBreach || false,
      actualBreach: predictionData.actualBreach !== undefined ? predictionData.actualBreach : null,
      leadTimeSeconds: predictionData.leadTimeSeconds || 0,
      predictedEtaMinutes: predictionData.predictedEtaMinutes || 0,
      details: predictionData.details || {},
      createdAt: timestamp
    };

    const docRef = await this.collection.add(record);
    return { id: docRef.id, ...record };
  }

  async getGovernanceMetrics() {
    if (!this.collection) {
      return { total_predictions: 0, mean_lead_time_seconds: 0, precision: 0, recall: 0 };
    }

    const snapshot = await this.collection.orderBy('createdAt', 'desc').limit(500).get();
    let total = snapshot.size;
    let sumLeadTime = 0;
    let sumEta = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      sumLeadTime += data.leadTimeSeconds || 0;
      sumEta += data.predictedEtaMinutes || 0;

      if (data.predictedBreach === true && data.actualBreach === true) {
        truePositives++;
      } else if (data.predictedBreach === true && data.actualBreach === false) {
        falsePositives++;
      } else if (data.predictedBreach === false && data.actualBreach === true) {
        falseNegatives++;
      }
    });

    const precision = (truePositives + falsePositives > 0) ? (truePositives / (truePositives + falsePositives)) : 1.0;
    const recall = (truePositives + falseNegatives > 0) ? (truePositives / (truePositives + falseNegatives)) : 1.0;

    return {
      total_predictions: total,
      mean_lead_time_seconds: total > 0 ? (sumLeadTime / total) : 0,
      mean_eta_minutes: total > 0 ? (sumEta / total) : 0,
      precision,
      recall
    };
  }
}

export const predictionRepository = new PredictionRepository();
export default predictionRepository;
