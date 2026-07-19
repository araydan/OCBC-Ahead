import type { Agent } from './base';
import type { ProjectedOutcome, ReasoningStep } from '../types';
import { fmtDate, money } from '../util';

/**
 * FX & Travel Agent — cross-journey orchestration. A flight booking (a spend
 * signal) becomes an FX + cards opportunity, tied back to the customer's goals.
 */
export const fxTravelAgent: Agent = {
  meta: { id: 'fxTravel', name: 'FX & Travel Agent', blurb: 'Handles trips and currencies', emoji: '✈️', accent: '#E8A33D' },
  defaultConfig: { id: 'fxTravel', mode: 'suggest', limits: { maxAutoFxSGD: 2500 } },

  evaluate(event, { state }) {
    if (event.type !== 'travel-signal') return null;
    const p = event.payload;
    const japan = state.goals.find((g) => g.id === 'goal_japan');
    const japanPct = japan ? Math.round((japan.saved / japan.target) * 100) : 0;

    const reasoning: ReasoningStep[] = [
      { label: 'Trip detected', detail: `${money(p.flightAmount)} ${p.airline} charge → ${p.destination}, ${fmtDate(p.tripDate)}.` },
      { label: 'FX timing', detail: `${p.pair} is ${p.lockRate} — near the top of its 90-day range; it usually softens before year-end.` },
      { label: 'Goal aware', detail: `Your Japan goal is ${japanPct}% funded — locking now protects that budget.` },
      { label: 'Card fit', detail: 'Your OCBC 90°N card waives FX fees in Japan vs 3.25% on your 365 card.' },
    ];
    const projectedOutcome: ProjectedOutcome[] = [
      { label: 'Est. saving vs waiting', value: `~${money(p.estSaving)}`, tone: 'good' },
      { label: 'On a trip budget of', value: `¥${p.budgetJPY.toLocaleString()}`, tone: 'neutral' },
    ];

    return {
      agentId: 'fxTravel',
      scenario: 'fx-travel',
      // Intent is "I'd act on this within your limits" — the policy engine decides
      // whether that means auto-lock (Auto + within limit) or ask first.
      kind: 'action-taken',
      title: `${p.destination} in September — lock a good ¥ rate?`,
      summary: `I saw your ${p.airline} booking to ${p.destination} (${fmtDate(p.tripDate)}). ${p.pair} is strong at ${p.lockRate}, so locking today's rate on ${money(p.sgdLock)} in your Global Currency Account protects your Japan budget — and your 90°N card is the one to carry there.`,
      reasoning,
      confidence: 0.81,
      dataUsed: ['Card transactions (flight booking)', `${p.pair} 90-day trend`, 'Your Japan goal', 'OCBC card FX terms'],
      projectedOutcome,
      action: { type: 'lockFxRate', label: `Lock ${money(p.sgdLock)} @ ${p.lockRate}`, params: { pair: p.pair, sgdAmount: p.sgdLock, rate: p.lockRate }, reversible: true },
      // The primary shows only while awaiting your tap (Suggest mode); once it's
      // auto-locked the card shows just Undo. The decline reads "Not now" when pending.
      choices: [
        { id: 'lock', label: `Lock ${money(p.sgdLock)} @ ${p.lockRate}`, kind: 'primary', resolvesTo: 'approved' },
        { id: 'undo', label: 'Undo', kind: 'secondary', resolvesTo: 'reverted' },
      ],
      priority: 2,
      voices: {
        acted: {
          title: `${p.destination} in September — I locked your ¥ rate`,
          summary: `I saw your ${p.airline} booking to ${p.destination} (${fmtDate(p.tripDate)}). ${p.pair} was strong at ${p.lockRate}, so I locked today's rate on ${money(p.sgdLock)} in your Global Currency Account — your Japan budget is protected, and your 90°N card is the one to carry there.`,
        },
        observed: {
          title: `${p.destination} in September — a good ¥ window, noted`,
          summary: `I saw your ${p.airline} booking to ${p.destination} (${fmtDate(p.tripDate)}). ${p.pair} is strong at ${p.lockRate} — locking ${money(p.sgdLock)} would protect your Japan budget. I'm in Observe, so I've only noted it.`,
        },
      },
    };
  },
};
