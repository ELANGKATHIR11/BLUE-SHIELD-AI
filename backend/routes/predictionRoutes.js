/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { Router } from 'express';
import { mlService } from '../services/mlService.js';
import { predictionRepository } from '../repositories/predictionRepository.js';

const router = Router();

// Evaluate live trajectory via ML
router.post('/trajectory', async (req, res, next) => {
  try {
    const { vesselId, aisId, locationHistory } = req.body;
    if (!locationHistory || locationHistory.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INSUFFICIENT_DATA', message: 'Location history points required' }
      });
    }

    const prediction = await mlService.predictTrajectory(vesselId, aisId, locationHistory);

    // Record prediction for evaluation and audit
    await predictionRepository.recordPrediction({
      aisId: aisId || vesselId,
      vesselId,
      predictionType: 'TRAJECTORY_RISK',
      riskScore: prediction.zoneAnalysis?.maxConfidence || 0,
      predictedBreach: prediction.zoneAnalysis?.willViolate || false,
      leadTimeSeconds: 900,
      predictedEtaMinutes: 15,
      details: prediction
    });

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    next(error);
  }
});

// Evaluate behavior anomalies
router.post('/behavior', async (req, res, next) => {
  try {
    const { vesselId, speed, heading, location } = req.body;
    const result = await mlService.predictBehavior(vesselId, { speed, heading, location });
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Log ground truth evaluation feedback
router.post('/evaluate', async (req, res, next) => {
  try {
    const { aisId, predictedBreach, actualBreach, predictedEtaMinutes, leadTimeSeconds, probability } = req.body;
    await predictionRepository.recordPrediction({
      aisId,
      predictionType: 'GROUND_TRUTH_EVAL',
      predictedBreach,
      actualBreach,
      predictedEtaMinutes,
      leadTimeSeconds,
      riskScore: probability || 0
    });

    res.json({
      success: true,
      message: 'Ground truth prediction evaluation recorded successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Governance metrics for ML lead time & precision
router.get('/metrics', async (req, res, next) => {
  try {
    const metrics = await predictionRepository.getGovernanceMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
});

export default router;
