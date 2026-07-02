import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { router } from '../../server/routes';

// The Gemini key lives in Secret Manager — never in client code or the JS bundle.
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

initializeApp();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// App Check: only requests bearing a valid token from our real web app may spend
// Gemini quota. /health stays open (cheap, reveals nothing) so the status light works.
async function requireAppCheck(req: Request, res: Response, next: NextFunction) {
  const token = req.header('X-Firebase-AppCheck');
  if (!token) return res.status(401).json({ error: 'Missing App Check token.' });
  try {
    await getAppCheck().verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid App Check token.' });
  }
}
app.use(['/api/ask', '/api/reason'], requireAppCheck);

// Hosting rewrites /api/** here and preserves the path, so the router stays under /api.
app.use('/api', router);

export const api = onRequest(
  { region: 'us-central1', secrets: [GEMINI_API_KEY], memory: '512MiB', timeoutSeconds: 120 },
  app,
);
