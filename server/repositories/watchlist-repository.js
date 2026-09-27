import { pool } from '../db/pool.js';

function requireDatabase() {
  if (!pool) {
    const error = new Error('Watchlists require DATABASE_URL and an initialized PostgreSQL database.');
    error.status = 503;
    throw error;
  }
}

export async function listWatchlist(firebaseUid) {
  requireDatabase();
  const result = await pool.query(`SELECT w.ticker,w.created_at,c.name,c.currency,c.price,c.data_mode
    FROM watchlists w JOIN companies c ON c.ticker=w.ticker WHERE w.firebase_uid=$1 ORDER BY w.created_at DESC`, [firebaseUid]);
  return result.rows.map(row => ({ ticker: row.ticker, createdAt: row.created_at, name: row.name, currency: row.currency, price: Number(row.price), dataMode: row.data_mode }));
}

export async function addWatchlistTicker(firebaseUid, ticker) {
  requireDatabase();
  await pool.query('INSERT INTO watchlists (firebase_uid,ticker) VALUES ($1,$2) ON CONFLICT (firebase_uid,ticker) DO NOTHING', [firebaseUid, ticker]);
  return listWatchlist(firebaseUid);
}

export async function removeWatchlistTicker(firebaseUid, ticker) {
  requireDatabase();
  await pool.query('DELETE FROM watchlists WHERE firebase_uid=$1 AND ticker=$2', [firebaseUid, ticker]);
  return listWatchlist(firebaseUid);
}
