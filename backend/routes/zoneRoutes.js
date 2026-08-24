/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { Router } from 'express';
import { geospatialService } from '../services/geospatialService.js';
import { zoneRepository } from '../repositories/zoneRepository.js';

const router = Router();

// Get GeoJSON features for prohibited maritime zones
router.get('/', async (req, res, next) => {
  try {
    const geojson = geospatialService.getProhibitedZonesGeoJSON();
    res.json({
      success: true,
      data: geojson
    });
  } catch (error) {
    next(error);
  }
});

// Check coordinate against geofence
router.post('/check', (req, res, next) => {
  try {
    const { lat, lng, latitude, longitude } = req.body;
    const actualLat = lat !== undefined ? lat : latitude;
    const actualLng = lng !== undefined ? lng : longitude;

    if (actualLat === undefined || actualLng === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: 'Latitude and Longitude are required' }
      });
    }

    const result = geospatialService.evaluateLocation(actualLat, actualLng);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
