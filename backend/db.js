import pgPromise from 'pg-promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pgp = pgPromise();
const db = pgp(process.env.DATABASE_URL || 'postgresql://postgres:Akilaarasu1!@localhost:5432/postgres');

export async function initDatabase() {
  console.log('🔌 Initializing PostgreSQL database connection...');
  try {
    // 1. Enable PostGIS Extension
    await db.none('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('✅ PostGIS extension checked/enabled.');

    // 2. Create tables
    await db.none(`
      CREATE TABLE IF NOT EXISTS vessel_logs (
        id SERIAL PRIMARY KEY,
        ais_id VARCHAR(50) NOT NULL,
        boat_id VARCHAR(50) NOT NULL,
        location GEOMETRY(Point, 4326) NOT NULL,
        speed DOUBLE PRECISION,
        heading DOUBLE PRECISION,
        status VARCHAR(20) DEFAULT 'safe',
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS prohibited_zones (
        id SERIAL PRIMARY KEY,
        zone_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100),
        geom GEOMETRY(Polygon, 4326) NOT NULL
      );
    `);
    console.log('✅ PostgreSQL tables created.');

    // 3. Seed prohibited zones from simplified GeoJSON if empty
    const zoneCount = await db.one('SELECT count(*)::int FROM prohibited_zones;');
    if (zoneCount.count === 0) {
      console.log('🌱 Seeding prohibited zones table from local GeoJSON...');
      const simplifiedPath = path.resolve('../project/public/data/gis/simplified/sri_lanka_eez_simplified.geojson');
      if (fs.existsSync(simplifiedPath)) {
        const geojsonData = JSON.parse(fs.readFileSync(simplifiedPath, 'utf8'));
        for (const feature of geojsonData.features) {
          const zoneId = feature.properties.mrgid || Math.random().toString(36).substr(2, 9);
          const name = feature.properties.geoname || 'Sri Lankan EEZ';
          
          // Only support Polygon types for this simple seed
          if (feature.geometry.type === 'Polygon') {
            const coords = feature.geometry.coordinates[0];
            const wktCoords = coords.map(c => `${c[0]} ${c[1]}`).join(', ');
            const wktPolygon = `POLYGON((${wktCoords}))`;
            
            await db.none(`
              INSERT INTO prohibited_zones (zone_id, name, geom)
              VALUES ($1, $2, ST_GeomFromText($3, 4326))
              ON CONFLICT (zone_id) DO NOTHING;
            `, [zoneId.toString(), name, wktPolygon]);
          }
        }
        console.log('✅ Prohibited zones seeded successfully.');
      }
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

export default db;
