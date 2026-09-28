import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, firebaseAdminConfigured, firebaseWebConfigured } from './server/config.js';
import { databaseHealth } from './server/db/pool.js';
import { stockRouter } from './server/routes/stock-routes.js';
import { watchlistRouter } from './server/routes/watchlist-routes.js';

const here = dirname(fileURLToPath(import.meta.url));
const apiLimiter = rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Try again in a minute.' } });
const stocksLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many stock analysis requests. Try again in a minute.' } });

export function createApp() {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'", 'https://financialmodelingprep.com', 'https://query1.finance.yahoo.com', 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com'],
      imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], frameAncestors: ["'none'"]
    } },
    crossOriginEmbedderPolicy: false
  }));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', apiLimiter);
  app.get('/api/health', async (_req, res) => {
    const database = await databaseHealth();
    const status = database.connected || !database.configured ? 'ok' : 'degraded';
    res.status(status === 'ok' ? 200 : 503).json({
      status, service: 'stock-fundamental-analyzer', database,
      providers: { fmpConfigured: Boolean(config.fmpApiKey), yahooEnabled: config.yahooEnabled, demoFallback: config.demoFallback },
      firebaseAuthConfigured: firebaseAdminConfigured && firebaseWebConfigured, time: new Date().toISOString()
    });
  });
  app.get('/api/config', (_req, res) => {
    const enabled = firebaseAdminConfigured && firebaseWebConfigured;
    res.set('Cache-Control', 'no-store').json({ authEnabled: enabled, firebase: enabled ? {
      apiKey: config.firebase.webApiKey, authDomain: config.firebase.authDomain,
      projectId: config.firebase.projectId, appId: config.firebase.appId
    } : null });
  });
  app.use('/api/stocks', stocksLimiter, stockRouter);
  app.use('/api/watchlist', watchlistRouter);
  app.get('/', (_req, res) => res.sendFile(resolve(here, 'index.html')));
  app.use('/css', express.static(resolve(here, 'css'), { maxAge: config.nodeEnv === 'production' ? '1h' : 0, etag: true }));
  app.use('/app', express.static(resolve(here, 'client'), { index: 'index.html', maxAge: config.nodeEnv === 'production' ? '1h' : 0, etag: true }));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use((error, _req, res, _next) => {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) console.error(error.stack || error.message);
    return res.status(status).json({ error: status >= 500 && config.nodeEnv === 'production' ? 'The server could not complete this request.' : error.message });
  });
  return app;
}
