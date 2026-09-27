import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL before applying database/schema.sql.');
const here = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(resolve(here, '../database/schema.sql'), 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : false });
try {
  await pool.query(sql);
  process.stdout.write('Database schema applied successfully.\n');
} finally {
  await pool.end();
}
