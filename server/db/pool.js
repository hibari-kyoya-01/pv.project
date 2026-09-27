import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;
export const pool = config.databaseUrl ? new Pool({
  connectionString: config.databaseUrl,
  ssl: config.pgSsl ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'stock-fundamental-analyzer'
}) : null;

if (pool) {
  pool.on('error', error => console.error('PostgreSQL idle client error:', error.message));
}

export async function databaseHealth() {
  if (!pool) return { configured: false, connected: false };
  try {
    await pool.query('SELECT 1');
    return { configured: true, connected: true };
  } catch (error) {
    return { configured: true, connected: false, error: error.message };
  }
}

export async function closePool() {
  if (pool) await pool.end();
}
