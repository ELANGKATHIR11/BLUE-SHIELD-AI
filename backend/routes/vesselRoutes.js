/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { Router } from 'express';
import { vesselService } from '../services/vesselService.js';
import { locationRepository } from '../repositories/locationRepository.js';
import { locationService } from '../services/locationService.js';
import { authService } from '../services/authService.js';

const router = Router();

// Register a new vessel
router.post('/register', async (req, res, next) => {
  try {
    const vessel = await vesselService.registerVessel(req.body, req.user?.uid || 'ANONYMOUS');
    res.status(201).json({
      success: true,
      data: vessel
    });
  } catch (error) {
    next(error);
  }
});

// Ingest vessel location telemetry
router.post('/location', async (req, res, next) => {
  try {
    const result = await locationService.ingestLocation(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Legacy backward-compatible endpoint for logging
router.post('/log', async (req, res, next) => {
  try {
    const result = await locationService.ingestLocation(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// List all active vessels
router.get('/active', async (req, res, next) => {
  try {
    const vessels = await vesselService.getAllActiveVessels();
    res.json({
      success: true,
      count: vessels.length,
      data: vessels
    });
  } catch (error) {
    next(error);
  }
});

// Get vessel by AIS ID
router.get('/:aisId', async (req, res, next) => {
  try {
    const vessel = await vesselService.getVessel(req.params.aisId);
    if (!vessel) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vessel not found' }
      });
    }
    res.json({
      success: true,
      data: vessel
    });
  } catch (error) {
    next(error);
  }
});

// Get vessel location history
router.get('/:aisId/history', async (req, res, next) => {
  try {
    const limitPoints = parseInt(req.query.limit) || 100;
    const history = await locationRepository.getRecentHistory(req.params.aisId, limitPoints);
    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

// Update vessel status
router.patch('/:aisId/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['safe', 'warning', 'danger'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be safe, warning, or danger' }
      });
    }
    await vesselService.updateVesselStatus(req.params.aisId, status, req.user?.uid || 'COAST_GUARD');
    res.json({
      success: true,
      message: `Vessel ${req.params.aisId} status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
});

export default router;
