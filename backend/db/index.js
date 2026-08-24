/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let pool = null;
let isPostgresConnected = false;

if (process.env.DATABASE_URL || (process.env.PGHOST && process.env.PGDATABASE)) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.warn('⚠️ PostgreSQL Pool Error:', err.message);
  });
}

/**
 * Execute query safely on PostgreSQL / PostGIS with fallback
 */
export async function query(text, params) {
  if (!pool) {
    return { rows: [], rowCount: 0 };
  }
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.warn('⚠️ PostgreSQL query fallback:', err.message);
    return { rows: [], rowCount: 0, error: err.message };
  }
}

export async function checkPostgresHealth() {
  if (!pool) return { status: 'not_configured', connected: false };
  try {
    const res = await pool.query('SELECT NOW() as now, PostGIS_Version() as postgis');
    isPostgresConnected = true;
    return {
      status: 'connected',
      connected: true,
      timestamp: res.rows[0]?.now,
      postgis: res.rows[0]?.postgis
    };
  } catch (err) {
    isPostgresConnected = false;
    return { status: 'disconnected', connected: false, error: err.message };
  }
}

export { pool, isPostgresConnected };
export default { query, pool, checkPostgresHealth };
