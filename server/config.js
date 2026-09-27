const integer = (value, fallback, min, max) => {
  const number = Number.parseInt(value ?? '', 10);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
};

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: integer(process.env.PORT, 3000, 1, 65535),
  databaseUrl: process.env.DATABASE_URL || '',
  pgSsl: process.env.PGSSL === 'true',
  cacheTtlSeconds: integer(process.env.CACHE_TTL_SECONDS, 21_600, 60, 2_592_000),
  demoFallback: process.env.DEMO_FALLBACK !== 'false',
  fmpApiKey: process.env.FMP_API_KEY || '',
  yahooCorsProxy: process.env.YAHOO_CORS_PROXY || 'https://api.allorigins.win/raw?url=',
  firebase: Object.freeze({
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    webApiKey: process.env.FIREBASE_WEB_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    appId: process.env.FIREBASE_APP_ID || ''
  })
});

export const firebaseAdminConfigured = Boolean(config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey);
export const firebaseWebConfigured = Boolean(config.firebase.webApiKey && config.firebase.authDomain && config.firebase.appId && config.firebase.projectId);
