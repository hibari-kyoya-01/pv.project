import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config, firebaseAdminConfigured } from '../config.js';

let firebaseAuth = null;
if (firebaseAdminConfigured) {
  const app = getApps()[0] || initializeApp({
    credential: cert({ projectId: config.firebase.projectId, clientEmail: config.firebase.clientEmail, privateKey: config.firebase.privateKey }),
    projectId: config.firebase.projectId
  });
  firebaseAuth = getAuth(app);
}

export async function requireFirebaseUser(req, res, next) {
  if (!firebaseAuth) return res.status(503).json({ error: 'Firebase Admin authentication is not configured on this server.' });
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Sign in to access your watchlist.' });
  try {
    req.firebaseUser = await firebaseAuth.verifyIdToken(match[1], true);
    return next();
  } catch {
    return res.status(401).json({ error: 'Your sign-in token is invalid or expired. Sign in again.' });
  }
}
