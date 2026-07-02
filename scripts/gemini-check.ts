// Quick diagnostic: which Gemini models does this key actually have quota for?
// Usage: npx tsx scripts/gemini-check.ts [model ...]
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const list = process.argv.slice(2);
const models = list.length
  ? list
  : ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.5-flash'];

if (!process.env.GEMINI_API_KEY) {
  console.log('No GEMINI_API_KEY in .env');
  process.exit(0);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

for (const m of models) {
  try {
    const r = await ai.models.generateContent({ model: m, contents: 'Reply with just the word OK.' });
    console.log(`OK   ${m} -> ${(r.text || '').trim().slice(0, 40)}`);
  } catch (e: any) {
    const msg = (e?.message || String(e)).replace(/\s+/g, ' ');
    const code = msg.match(/"code":(\d+)/)?.[1] ?? '';
    const reason = /limit: 0/.test(msg) ? 'free tier limit:0 (no free quota)' : /API_KEY_INVALID|API key not valid/.test(msg) ? 'invalid key' : msg.slice(0, 80);
    console.log(`FAIL ${m} -> [${code}] ${reason}`);
  }
}
