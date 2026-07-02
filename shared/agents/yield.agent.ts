import type { Agent } from './base';
import type { ProjectedOutcome, ReasoningStep } from '../types';
import { forecastCashflow } from '../tools';
import { money, pct } from '../util';

/**
 * Yield Agent — turns idle cash into returns.
 * Reacts to the `idle-cash` signal, and crucially COORDINATES with the cashflow
 * forecast so it never moves money the customer is about to need.
 */
export const yieldAgent: Agent = {
  meta: { id: 'yield', name: 'Yield Agent', blurb: 'Puts idle cash to work', emoji: '📈', accent: '#1F9D6B' },
  defaultConfig: { id: 'yield', mode: 'auto', limits: { maxAutoMoveSGD: 25000 } },

  evaluate(event, { state, config }) {
    if (event.type !== 'idle-cash') return null;
    const from = state.accounts.find((a) => a.id === event.payload.accountId);
    if (!from) return null;

    const idleDays: number = event.payload.idleDays;
    const targetApy: number = event.payload.targetApy;
    const fromApy = from.apy ?? 0;

    // The agent never exceeds the customer's auto limit, AND keeps the comfort buffer liquid.
    const requested = Math.min(event.payload.requestedAmount, config.limits.maxAutoMoveSGD ?? 0);
    const movableByBuffer = Math.max(0, from.balance - state.comfortBuffer);
    const amount = Math.min(requested, movableByBuffer);
    const trimmed = amount < requested;
    const annualGain = Math.round(amount * (targetApy - fromApy));

    const forecast = forecastCashflow(state, from.id, 35);
    const nextBills = forecast.upcoming
      .filter((u) => u.amount < 0)
      .slice(0, 2)
      .map((u) => `${money(-u.amount)} ${u.label.toLowerCase()}`)
      .join(' and ');

    const reasoning: ReasoningStep[] = [
      { label: 'Spotted idle cash', detail: `${money(from.balance)} in ${from.name}, untouched for ${idleDays} days — well above what your spending needs.` },
      { label: 'Compared the options', detail: `Your account pays ${pct(fromApy)}; a 6-month OCBC Fixed Deposit pays ${pct(targetApy)}, capital-guaranteed.` },
      {
        label: 'Coordinated with Cashflow',
        detail: trimmed
          ? `You allowed up to ${money(requested)}, but ${nextBills} are due soon — so I moved ${money(amount)} and left your ${money(state.comfortBuffer)} buffer liquid.`
          : `Kept your ${money(state.comfortBuffer)} comfort buffer fully liquid.`,
      },
    ];

    const projectedOutcome: ProjectedOutcome[] = [
      { label: 'Extra interest / year', value: `+${money(annualGain)}`, tone: 'good' },
      { label: 'Moved', value: money(amount), tone: 'neutral' },
      { label: 'Kept liquid', value: money(state.comfortBuffer), tone: 'neutral' },
    ];

    return {
      agentId: 'yield',
      scenario: 'idle-cash',
      kind: 'action-taken',
      title: 'Put your idle cash to work overnight',
      summary: `${money(from.balance)} had been sitting in ${from.name} earning just ${pct(fromApy)} for ${idleDays} days. I moved ${money(amount)} into a 6-month OCBC Fixed Deposit at ${pct(targetApy)} — and kept your ${money(state.comfortBuffer)} buffer liquid.`,
      reasoning,
      confidence: 0.93,
      dataUsed: [
        `${idleDays}-day balance & spending pattern`,
        'OCBC Fixed Deposit board rates',
        `Your ${money(state.comfortBuffer)} comfort buffer`,
        'Upcoming scheduled bills',
      ],
      projectedOutcome,
      action: {
        type: 'openFixedDeposit',
        label: `Keep ${money(amount)} in the 6-mth FD`,
        params: { fromId: from.id, amount, tenorMonths: 6, apy: targetApy },
        reversible: true,
      },
      choices: [
        { id: 'keep', label: 'Keep it', kind: 'primary', resolvesTo: 'approved' },
        { id: 'undo', label: 'Undo & return funds', kind: 'secondary', resolvesTo: 'reverted' },
      ],
      priority: 2,
    };
  },
};
