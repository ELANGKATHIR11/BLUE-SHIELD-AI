import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db, { initDatabase } from './db.js';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Initialize Postgres & PostGIS
initDatabase();

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', database: 'connected', time: new Date() });
});

// Endpoint: Log vessel telemetry & perform PostGIS Geofence Check
app.post('/api/vessels/log', async (req, res) => {
  const { aisId, boatId, lat, lng, speed, heading } = req.body;
  if (!aisId || !lat || !lng) {
    return res.status(400).json({ error: 'aisId, lat, and lng are required.' });
  }

  try {
    // 1. Insert log using PostGIS ST_SetSRID and ST_MakePoint
    await db.none(`
      INSERT INTO vessel_logs (ais_id, boat_id, location, speed, heading, status, timestamp)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, 'safe', CURRENT_TIMESTAMP)
    `, [aisId, boatId || 'UNKNOWN', lng, lat, speed || 0, heading || 0]);

    // 2. Perform PostGIS Geofencing check
    // Check if the coordinate is inside any Sri Lankan EEZ / Prohibited zone in PostGIS
    const violationCheck = await db.oneOrNone(`
      SELECT p.name, ST_Distance(
        ST_SetSRID(ST_MakePoint($1, $2), 4326),
        p.geom
      ) as distance
      FROM prohibited_zones p
      WHERE ST_Contains(p.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 1;
    `, [lng, lat]);

    let alertLevel = 'safe';
    let alertMessage = 'Within safe Indian waters';

    if (violationCheck) {
      alertLevel = 'danger';
      alertMessage = `⚠️ CRITICAL: Crossed into ${violationCheck.name || 'Sri Lankan EEZ Border'}! Turn back immediately.`;
      
      // Update the logged status to 'danger'
      await db.none(`
        UPDATE vessel_logs 
        SET status = 'danger' 
        WHERE ais_id = $1 AND timestamp = (SELECT max(timestamp) FROM vessel_logs WHERE ais_id = $1)
      `, [aisId]);
    }

    res.json({
      success: true,
      aisId,
      alertLevel,
      alertMessage,
      position: { lat, lng }
    });
  } catch (error) {
    console.error('Error logging vessel telemetry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Fetch latest vessel statuses
app.get('/api/vessels/active', async (req, res) => {
  try {
    const activeVessels = await db.any(`
      SELECT DISTINCT ON (ais_id) 
        ais_id as "aisId", 
        boat_id as "boatId", 
        ST_Y(location::geometry) as lat, 
        ST_X(location::geometry) as lng, 
        speed, 
        heading, 
        status, 
        EXTRACT(EPOCH FROM timestamp) * 1000 as "lastUpdate"
      FROM vessel_logs
      ORDER BY ais_id, timestamp DESC;
    `);
    res.json(activeVessels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Fetch Prohibited Zones as GeoJSON from PostGIS
app.get('/api/zones', async (req, res) => {
  try {
    const zones = await db.any(`
      SELECT zone_id, name, ST_AsGeoJSON(geom)::json as geojson
      FROM prohibited_zones;
    `);
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Express PostGIS Server running on http://localhost:${PORT}`);
});
