import 'dotenv/config';
import { createServer } from 'node:http';
import { config } from './server/config.js';
import { closePool } from './server/db/pool.js';
import { createApp } from './app.js';

const server = createServer(createApp()).listen(config.port, () => {
  console.log(`Stock Fundamental Analyzer listening on http://localhost:${config.port}`);
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(async error => {
    if (error) console.error('HTTP server shutdown failed:', error.message);
    try { await closePool(); } finally { process.exit(error ? 1 : 0); }
  });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, shutdown);
