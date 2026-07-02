// Offline, deterministic "Ask why / what-if" engine.
// This is the fallback that makes the demo bulletproof with NO API key and NO
// network. It composes a coherent answer from the proposal's own reasoning,
// policy, confidence and projected outcome. The server (real-LLM) path produces
// richer free-form answers, but this always works.
import type { AgentProposal, FinancialState } from '../types';
import { AGENT_META } from '../agents/registry';

const has = (q: string, ...keys: string[]) => keys.some((k) => q.includes(k));

export function suggestedQuestions(proposal: AgentProposal): string[] {
  const out = ['Why did you do this?', 'How confident are you?'];
  out.push(proposal.action?.reversible ? 'Can I undo this?' : 'Why send this to a human?');
  if (proposal.projectedOutcome.length) out.push("What's the impact for me?");
  return out;
}

export function answerQuestion(proposal: AgentProposal, _state: FinancialState, question: string): string {
  const q = question.trim().toLowerCase();
  const conf = Math.round(proposal.confidence * 100);
  const agent = AGENT_META[proposal.agentId]?.name ?? 'The agent';
  const reasons = proposal.reasoning.map((r) => `• ${r.label}: ${r.detail}`).join('\n');
  const data = proposal.dataUsed.map((d) => `• ${d}`).join('\n');
  const outcomes = proposal.projectedOutcome.map((o) => `${o.label}: ${o.value}`).join(' · ');

  if (!q) return `${agent} here. Ask me why I did this, whether it's reversible, how confident I am, or what it means for you.`;

  if (has(q, 'what if', 'undo', 'revers', 'revert', 'cancel', 'take back', 'change my mind')) {
    return proposal.action?.reversible
      ? `${agent}: This is fully reversible. “${proposal.action.label}” can be undone in one tap from here or the Decision Log — your balances snap back exactly to where they were. Nothing is locked in, which is precisely why I was comfortable acting.`
      : `${agent}: I didn't execute this myself — it isn't a one-tap-reversible move (it involves an outside party or a lock-in). That's exactly why I routed it to a human RM for you to decide, rather than acting automatically.`;
  }

  if (has(q, 'safe', 'sure', 'confiden', 'risk', 'trust', 'how do you know', 'certain')) {
    return `${agent}: I'm ${conf}% confident. That's based on:\n${data}\nAnd I stayed inside the limits you set — ${proposal.policy.reason}`;
  }

  if (has(q, 'how much', 'impact', 'save', 'gain', 'cost', 'worth', 'benefit', 'mean for me')) {
    return `${agent}: The projected impact is — ${outcomes}.\n${proposal.summary}`;
  }

  if (has(q, 'data', 'source', 'which data', 'what did you look', 'where', 'privacy')) {
    return `${agent}: I looked at:\n${data}\nAll of it is your own OCBC data — nothing was shared outside the bank to reach this.`;
  }

  if (has(q, 'who decided', 'allowed', 'permission', 'control', 'auto', 'why did you act')) {
    return `${agent}: ${proposal.policy.reason} You can change my autonomy any time in the Control Center — set me to Observe, Suggest, or Auto, and adjust my limits.`;
  }

  // Default: explain the "why".
  return `${agent}: ${proposal.summary}\n\nHere's my reasoning:\n${reasons}\n\nAnd the control logic: ${proposal.policy.reason} (confidence ${conf}%).`;
}
