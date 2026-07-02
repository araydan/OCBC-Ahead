import { Router } from 'express';
import { askAgent, reason, hasKey, MODEL } from './anthropic';
import { askGemini, hasGeminiKey, GEMINI_MODEL } from './gemini';
import { askOllama, ollamaEnabled, pingOllama, OLLAMA_MODEL } from './ollama';

export const router = Router();

// Pick the Ask provider: cloud keys win if present, else a local Ollama model,
// else null → the frontend silently uses its scripted fallback.
function activeAsk() {
  if (hasGeminiKey()) return { provider: 'gemini' as const, model: GEMINI_MODEL, run: askGemini };
  if (hasKey()) return { provider: 'anthropic' as const, model: MODEL, run: askAgent };
  if (ollamaEnabled()) return { provider: 'ollama' as const, model: OLLAMA_MODEL, run: askOllama };
  return null;
}

router.get('/health', async (_req, res) => {
  const a = activeAsk();
  // For Ollama we can cheaply verify it's actually running, so the green light stays honest.
  const llm = a?.provider === 'ollama' ? await pingOllama() : Boolean(a);
  res.json({ ok: true, llm, provider: a?.provider ?? null, model: a?.model ?? null });
});

// Grounded "why / what-if" — used by the in-app Ask panel when in LLM mode.
router.post('/ask', async (req, res) => {
  const { proposal, state, question } = req.body ?? {};
  if (!proposal || !state || !question) return res.status(400).json({ error: 'Missing proposal, state, or question.' });
  const a = activeAsk();
  if (!a) return res.status(503).json({ error: 'No LLM configured — using scripted fallback.' });
  try {
    const answer = await a.run(proposal, state, question);
    if (!answer) throw new Error('empty answer from model');
    res.json({ answer, source: 'llm', provider: a.provider, model: a.model });
  } catch (e: any) {
    console.error('ask error:', e?.message);
    res.status(500).json({ error: e?.message ?? 'reasoning failed' });
  }
});

// Multi-agent tool-use loop (Anthropic/Claude-specific). Curl-able; documented in ARCHITECTURE.md.
router.post('/reason', async (req, res) => {
  const { event, state } = req.body ?? {};
  if (!event || !state) return res.status(400).json({ error: 'Missing event or state.' });
  if (!hasKey()) return res.status(503).json({ error: 'No ANTHROPIC_API_KEY configured (the /reason tool-loop uses Claude).' });
  try {
    const out = await reason(event, state);
    res.json({ ...out, source: 'llm' });
  } catch (e: any) {
    console.error('reason error:', e?.message);
    res.status(500).json({ error: e?.message ?? 'reasoning failed' });
  }
});
