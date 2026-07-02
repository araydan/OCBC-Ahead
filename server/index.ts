import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router } from './routes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/api', router);

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  const provider = process.env.GEMINI_API_KEY
    ? `Gemini (${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}) — free tier`
    : process.env.ANTHROPIC_API_KEY
      ? `Claude (${process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'})`
      : process.env.OLLAMA_MODEL
        ? `Ollama (${process.env.OLLAMA_MODEL}) — local & free (start it with: ollama serve)`
        : null;
  console.log(`\n🤖 OCBC Ahead reasoning backend → http://localhost:${PORT}`);
  console.log(
    provider
      ? `   Ask LLM path ENABLED → ${provider}\n`
      : '   LLM path disabled — the frontend will use its scripted fallback.\n',
  );
});
