// Free, NO-KEY reasoning via a LOCAL model with Ollama (https://ollama.com).
// Runs entirely on your machine — no API key, no cloud, no cost, works offline.
// Setup: install Ollama, run `ollama pull llama3.2`, set OLLAMA_MODEL in .env.
import type { AgentProposal, FinancialState } from '../shared/types';
import { buildAskPrompt } from '../shared/reasoning/prompts';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || '';

export const ollamaEnabled = (): boolean => Boolean(OLLAMA_MODEL);

/** Is a local Ollama actually running? Cheap + fast, so the health light can't lie. */
export async function pingOllama(): Promise<boolean> {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(800) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function askOllama(proposal: AgentProposal, state: FinancialState, question: string): Promise<string> {
  const { system, user } = buildAskPrompt(proposal, state, question);
  const r = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
      options: { temperature: 0.4, num_predict: 1024 },
    }),
  });
  if (!r.ok) throw new Error(`Ollama HTTP ${r.status} — is it running? (run: ollama serve)`);
  const data: any = await r.json();
  return (data?.message?.content ?? '').trim();
}
