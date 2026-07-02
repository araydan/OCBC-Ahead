// Picks the reasoning source for the "Ask why / what-if" feature.
// In 'llm' mode it calls the optional backend; if that fails for ANY reason it
// silently falls back to the deterministic scripted engine so the demo never
// breaks on stage.
import type { AgentProposal, FinancialState } from '@shared/types';
import { answerQuestion as scriptedAnswer, suggestedQuestions } from '@shared/reasoning/scripted';
import { appCheckHeader } from '@/lib/appCheck';

export { suggestedQuestions };

export interface AskResult {
  answer: string;
  source: 'llm' | 'scripted';
  model?: string;
}

export async function askReasoning(
  mode: 'scripted' | 'llm',
  proposal: AgentProposal,
  state: FinancialState,
  question: string,
): Promise<AskResult> {
  if (mode === 'llm') {
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await appCheckHeader()) },
        body: JSON.stringify({ proposal, state, question }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.answer) return { answer: data.answer, source: 'llm', model: data.model };
      }
    } catch {
      /* fall through to scripted */
    }
  }
  return { answer: scriptedAnswer(proposal, state, question), source: 'scripted' };
}

/** Is the real-LLM backend reachable AND configured with a key? */
export async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.llm);
  } catch {
    return false;
  }
}
