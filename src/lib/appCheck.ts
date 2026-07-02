// Firebase App Check — proves requests come from our real web app before the
// backend will spend Gemini quota. The token is attached to /api/ask calls and
// verified server-side (functions/src/index.ts). If anything here fails, callers
// fall back to the scripted engine, so the app never hard-breaks.
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: 'AIzaSyC3988Seh6j0GQxJs2SVXDkvPxQVaoSWTk',
  authDomain: 'ocbc-ahead-app.firebaseapp.com',
  projectId: 'ocbc-ahead-app',
  storageBucket: 'ocbc-ahead-app.firebasestorage.app',
  messagingSenderId: '195285808586',
  appId: '1:195285808586:web:ae1815e60277a61a7c0b33',
};

// Public reCAPTCHA v3 site key (safe to ship in the client). Set in .env.
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

const appCheck = SITE_KEY
  ? initializeAppCheck(initializeApp(firebaseConfig), {
      provider: new ReCaptchaV3Provider(SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    })
  : null;

/** Returns the App Check header, or {} if App Check isn't configured/available. */
export async function appCheckHeader(): Promise<Record<string, string>> {
  if (!appCheck) return {};
  try {
    const { token } = await getToken(appCheck, false);
    return { 'X-Firebase-AppCheck': token };
  } catch {
    return {};
  }
}
