import type { Agent } from './base';
import type { ProjectedOutcome, ReasoningStep } from '../types';
import { money } from '../util';

/**
 * Protection Agent — guards every dollar leaving the account.
 * Safety-critical: it always surfaces (its autonomy floor is "Suggest" — it can
 * never be silenced) and it auto-PAUSES suspicious transfers with Money Lock,
 * but it never blocks or releases without the customer's explicit call.
 */
export const protectionAgent: Agent = {
  meta: { id: 'protection', name: 'Protection Agent', blurb: 'Guards every dollar leaving your account', emoji: '🛡️', accent: '#E30613' },
  defaultConfig: { id: 'protection', mode: 'suggest', limits: {} },

  evaluate(event, { state }) {
    if (event.type !== 'outgoing-transfer') return null;
    const t = [...state.pendingTransfers].reverse().find((x) => x.status === 'held');
    if (!t) return null;
    const p = event.payload;

    const reasoning: ReasoningStep[] = [
      { label: 'Brand-new payee', detail: `“${t.payee}” was added ${p.payeeAddedMins} minutes before the transfer.` },
      { label: 'Unusual amount', detail: `${money(t.amount)} vs your ${money(p.avgAmount)} average ${t.channel} transfer.` },
      { label: 'Odd hour', detail: `${p.timeLabel} — outside anything in your 12-month history.` },
      { label: 'Known scam shape', detail: 'Matches a “friend-in-trouble” impersonation pattern OCBC flagged this week.' },
    ];
    const projectedOutcome: ProjectedOutcome[] = [
      { label: 'Potential loss held', value: money(t.amount), tone: 'good' },
      { label: 'Account', value: 'Money Lock ON', tone: 'neutral' },
    ];

    return {
      agentId: 'protection',
      scenario: 'scam-protection',
      kind: 'protection-alert',
      title: `I paused a ${money(t.amount)} transfer that doesn't look like you`,
      summary: `A transfer to a new payee “${t.payee}” was started at ${p.timeLabel} via ${t.channel} — about ${p.timesAvg}× your usual ${t.channel} amount. I've held it with Money Lock until you confirm.`,
      reasoning,
      confidence: 0.88,
      dataUsed: ['Payee history', '12-month transfer pattern', 'Time-of-day model', 'OCBC scam intelligence feed', 'Money Lock status'],
      projectedOutcome,
      action: { type: 'pauseTransfer', label: 'Keep it held', params: { transferId: t.id }, reversible: true },
      choices: [
        { id: 'block', label: 'Block & report', kind: 'danger', resolvesTo: 'blocked' },
        { id: 'release', label: 'It was me — release', kind: 'secondary', resolvesTo: 'confirmed' },
      ],
      resolutionCopy: {
        blocked: `Blocked and reported — ${money(t.amount)} never left your account. Money Lock stays on.`,
        confirmed: `Released — ${money(t.amount)} sent to ${t.payee}, since you confirmed it was you.`,
      },
      priority: 5,
    };
  },
};
