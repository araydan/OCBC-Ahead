import type { Agent } from './base';
import type { ProjectedOutcome, ReasoningStep } from '../types';
import { money, pct } from '../util';

/**
 * Debt & Credit Agent â€” watches loans and rates. It is deliberately set to
 * Observe by default: a refinance is big and largely irreversible, so the agent
 * NEVER acts. Its job is to spot the opportunity and hand it to a human RM with
 * a complete pack. This is "humans in control" working both ways.
 */
export const debtAgent: Agent = {
  meta: { id: 'debt', name: 'Debt & Credit Agent', blurb: 'Watches your loans and rates', emoji: 'ðŸ¦', accent: '#8A6FE8' },
  defaultConfig: { id: 'debt', mode: 'observe', limits: {} },

  evaluate(event) {
    if (event.type !== 'refinance-signal') return null;
    const p = event.payload;
    const totalSaving = Math.round(p.monthlySaving * 12 * p.remainingYears);

    const reasoning: ReasoningStep[] = [
      { label: 'Why now', detail: 'Your salary credit is up 12% over 6 months and your surplus is consistent.' },
      { label: 'The opportunity', detail: `Your loan is on ${pct(p.currentRate)}; OCBC's 2-year fixed is ${pct(p.newRate)}.` },
      { label: 'The math', detail: `On ${money(p.outstanding)} over ${p.remainingYears} years, ~${money(p.monthlySaving)}/mo (~${money(p.monthlySaving * 12)}/yr).` },
      { label: 'Why a human decides', detail: 'Refinancing involves lock-in, legal subsidy clawback and TDSR checks â€” a person should walk you through it.' },
    ];
    const projectedOutcome: ProjectedOutcome[] = [
      { label: 'Est. monthly saving', value: money(p.monthlySaving), tone: 'good' },
      { label: 'Over remaining term', value: `~${money(totalSaving)}`, tone: 'good' },
      { label: 'Decision owner', value: 'You + your RM', tone: 'neutral' },
    ];

    return {
      agentId: 'debt',
      scenario: 'human-handoff',
      kind: 'human-handoff',
      title: `Your home loan may be costing you ${money(p.monthlySaving)}/month too much`,
      summary: `Your income rose and 2-year fixed rates fell to ~${pct(p.newRate)}. Refinancing your ${money(p.outstanding)} loan from ${pct(p.currentRate)} could save about ${money(p.monthlySaving)}/month. This is a big, mostly irreversible decision â€” I've prepared a full pack and lined up a human RM.`,
      reasoning,
      confidence: 0.78,
      dataUsed: ['6-month salary trend', 'Home loan account', 'OCBC mortgage board rates', 'TDSR rules'],
      projectedOutcome,
      action: { type: 'escalateToHuman', label: 'Book a call with an RM', params: { topic: 'Mortgage refinance review' }, reversible: false },
      choices: [
        { id: 'book', label: 'Book a call with an RM', kind: 'primary', resolvesTo: 'escalated' },
        { id: 'notnow', label: 'Not now', kind: 'secondary', resolvesTo: 'rejected' },
      ],
      resolutionCopy: {
        escalated: `Booked â€” your RM has the full refinancing pack and will call within a day.`,
        rejected: `Parked â€” I’ll keep watching rates and flag it again if the saving grows.`,
      },
      priority: 1,
    };
  },
};

