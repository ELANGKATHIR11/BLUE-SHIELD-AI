/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { Router } from 'express';
import { locationService } from '../services/locationService.js';
import { authService } from '../services/authService.js';

const router = Router();

/**
 * POST /api/telemetry
 * Canonical authenticated endpoint for all incoming telemetry packets (Browser GPS, AIS, IoT)
 */
router.post('/', async (req, res, next) => {
  try {
    const userContext = req.user ? { uid: req.user.uid, vesselId: req.user.vesselId } : undefined;
    const result = await locationService.ingestLocation(req.body, userContext);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
