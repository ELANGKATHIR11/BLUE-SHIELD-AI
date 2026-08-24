/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { Router } from 'express';
import { alertService } from '../services/alertService.js';
import { alertRepository } from '../repositories/alertRepository.js';

const router = Router();

// Create / send alert manually (e.g. from ML service or Coast Guard)
router.post('/send', async (req, res, next) => {
  try {
    const alert = await alertRepository.create(req.body);
    if (alertService.io) {
      alertService.io.emit('alert:new', alert);
    }
    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
});

// Get unacknowledged alerts for command center
router.get('/unacknowledged', async (req, res, next) => {
  try {
    const { severity } = req.query;
    const alerts = await alertService.getUnacknowledgedAlerts(severity);
    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
});

// Get alerts for a specific vessel
router.get('/vessel/:aisId', async (req, res, next) => {
  try {
    const alerts = await alertService.getVesselAlerts(req.params.aisId);
    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
});

// Acknowledge an alert
router.post('/:alertId/acknowledge', async (req, res, next) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;
    await alertService.acknowledgeAlert(alertId, acknowledgedBy || 'Coast Guard Command');
    res.json({
      success: true,
      message: `Alert ${alertId} acknowledged successfully`
    });
  } catch (error) {
    next(error);
  }
});

export default router;
