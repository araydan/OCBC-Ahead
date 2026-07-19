import type { Agent } from './base';
import type { FinancialState, ProjectedOutcome, ProposalDraft, ReasoningStep } from '../types';
import { forecastCashflow } from '../tools';
import { fmtDate, money } from '../util';

/**
 * Cashflow Agent — looks ahead so the customer never gets caught short, and
 * auto-allocates each paycheck within guardrails. Both behaviours adapt to the
 * same forward-looking forecast.
 */
export const cashflowAgent: Agent = {
  meta: { id: 'cashflow', name: 'Cashflow Agent', blurb: 'Looks ahead so you never get caught short', emoji: '🌊', accent: '#2F6BFF' },
  defaultConfig: { id: 'cashflow', mode: 'auto', limits: { maxAutoAllocateSGD: 3000 } },

  evaluate(event, { state }) {
    if (event.type === 'bill-forecast') return shortfall(state);
    if (event.type === 'salary') return allocate(state, event.payload.amount);
    return null;
  },
};

function shortfall(state: FinancialState): ProposalDraft | null {
  // Forecast the customer's *spending float*, not whatever surplus is parked in
  // the account right now. Cash above the comfort buffer is savings the Yield
  // Agent sweeps into a Fixed Deposit — so the pinch a customer actually feels is
  // bills vs. buffer. Anchoring here keeps the shortfall stable whether or not the
  // overnight sweep is currently in place (e.g. after the customer taps Undo).
  const current = state.accounts.find((a) => a.id === 'acc_current');
  const spendingFloat = Math.min(current?.balance ?? 0, state.comfortBuffer);
  const forecast = forecastCashflow(state, 'acc_current', 30, spendingFloat);
  if (!forecast.belowBuffer) return null;

  const gap = Math.round(state.comfortBuffer - forecast.projectedLow);
  const a360 = state.accounts.find((a) => a.id === 'acc_360');
  // Cover the gap (rounded up to a clean S$1k), but never propose moving more than
  // the 360 Account actually holds — else the top-up overpromises or fails.
  const topUp = Math.min(a360?.balance ?? 0, Math.ceil(gap / 1000) * 1000);
  const bills = forecast.upcoming
    .filter((u) => u.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 2);
  const billText = bills.map((b) => `${money(-b.amount)} ${b.label.toLowerCase()} (${fmtDate(b.date)})`).join(' and ');

  const reasoning: ReasoningStep[] = [
    { label: 'Forecast 30 days ahead', detail: 'Walked every scheduled bill and GIRO against your expected salary.' },
    { label: 'Found the pinch', detail: `${billText} land before your buffer recovers. Low point: ${money(forecast.projectedLow)} on ${fmtDate(forecast.lowDate)}.` },
    { label: 'Checked your pots', detail: `Your 360 Account holds ${money(a360?.balance ?? 0)} — enough to bridge without breaking your Fixed Deposit.` },
  ];
  const projectedOutcome: ProjectedOutcome[] = [
    { label: 'Projected low', value: `${money(forecast.projectedLow)} · ${fmtDate(forecast.lowDate)}`, tone: 'warn' },
    { label: 'Below buffer by', value: `-${money(gap)}`, tone: 'warn' },
    { label: 'If you top up', value: 'stays above buffer', tone: 'good' },
  ];

  return {
    agentId: 'cashflow',
    scenario: 'cashflow-shortfall',
    kind: 'needs-approval', // a multi-option decision — deliberately handed to the customer
    title: 'A tight stretch is coming — here are your options',
    summary: `After ${billText}, your Everyday Account is projected to dip to ${money(forecast.projectedLow)} on ${fmtDate(forecast.lowDate)} — ${money(gap)} below your ${money(state.comfortBuffer)} comfort buffer. Nothing's wrong yet; I caught it early.`,
    reasoning,
    confidence: 0.86,
    dataUsed: ['Scheduled bills & GIRO', 'Salary date & amount', 'All account balances', 'Your comfort buffer'],
    projectedOutcome,
    action: { type: 'moveFunds', label: `Top up ${money(topUp)} from 360`, params: { fromId: 'acc_360', toId: 'acc_current', amount: topUp }, reversible: true },
    choices: [
      { id: 'topup', label: `Top up ${money(topUp)} from 360`, kind: 'primary', resolvesTo: 'approved' },
      { id: 'instalment', label: 'Split IRAS into GIRO instalments', kind: 'secondary', resolvesTo: 'approved', resolvedText: 'IRAS is now split into 12 GIRO instalments — no lump sum, and your buffer holds.' },
      { id: 'dismiss', label: "Dismiss — I'll handle it", kind: 'secondary', resolvesTo: 'rejected' },
    ],
    resolutionCopy: {
      approved: `Done — I moved ${money(topUp)} from your 360 to Everyday. You’ll stay above your buffer through the pinch.`,
      rejected: `Okay — I’ll stay out of it, and I’ll warn you again closer to the dip.`,
    },
    priority: 3,
    voices: {
      observed: {
        title: 'A tight stretch is coming — flagged for you',
        summary: `After ${billText}, your Everyday Account is projected to dip to ${money(forecast.projectedLow)} on ${fmtDate(forecast.lowDate)} — ${money(gap)} below your ${money(state.comfortBuffer)} comfort buffer. I'm in Observe, so I've flagged it and taken no action.`,
      },
    },
  };
}

function allocate(state: FinancialState, salary: number): ProposalDraft | null {
  const bto = state.goals.find((g) => g.id === 'goal_bto');
  if (!bto) return null;

  const baseBto = Math.round(salary * 0.15);
  const baseJapan = Math.round(salary * 0.1);
  const baseEmergency = Math.round(salary * 0.1);
  const baseTotal = baseBto + baseJapan + baseEmergency;

  // Adapt the allocation to the near-term forecast: if a shortfall looms, only
  // move the priority slice now and auto-move the rest once the pinch clears.
  const tight = forecastCashflow(state, 'acc_current', 21).belowBuffer;
  const splits = tight
    ? [{ goalId: 'goal_bto', amount: baseBto }]
    : [
        { goalId: 'goal_bto', amount: baseBto },
        { goalId: 'goal_japan', amount: baseJapan },
        { goalId: 'goal_emergency', amount: baseEmergency },
      ];
  const movedNow = splits.reduce((t, x) => t + x.amount, 0);
  const deferred = baseTotal - movedNow;
  const btoPctBefore = Math.round((bto.saved / bto.target) * 100);
  const btoPctAfter = Math.round(((bto.saved + baseBto) / bto.target) * 100);

  // The first two reasoning steps are analysis and hold in every voice; only the
  // third describes the move itself, so it carries the tense.
  const reasoningBase: ReasoningStep[] = [
    { label: 'Payday detected', detail: `${money(salary)} salary credited to your Everyday Account.` },
    { label: 'Applied your rule', detail: `15% BTO · 10% Japan · 10% emergency = ${money(baseTotal)}.` },
  ];
  const reasoning: ReasoningStep[] = [
    ...reasoningBase,
    tight
      ? { label: 'Protected your buffer', detail: `IRAS is due within the week, so I deferred ${money(deferred)} (Japan + emergency) and moved only the BTO ${money(baseBto)} now.` }
      : { label: 'Within guardrails', detail: `${money(movedNow)} is within your ${money(3000)} auto-allocate limit.` },
  ];
  const reasoningPlanned: ReasoningStep[] = [
    ...reasoningBase,
    tight
      ? { label: 'Protecting your buffer', detail: `IRAS is due within the week, so the plan defers ${money(deferred)} (Japan + emergency) and moves only the BTO ${money(baseBto)} now.` }
      : { label: 'Within guardrails', detail: `${money(movedNow)} is within your ${money(3000)} auto-allocate limit.` },
  ];

  const btoRow: ProjectedOutcome = { label: 'BTO reno goal', value: `${btoPctBefore}% → ${btoPctAfter}%`, tone: 'good' };
  const deferredRow: ProjectedOutcome[] = deferred > 0 ? [{ label: 'Deferred (auto, after IRAS)', value: money(deferred), tone: 'neutral' }] : [];
  // On a not-yet-acted card, "auto, after IRAS" would promise a move that may
  // never happen (Observe never acts) — keep the planned row conditional too.
  const deferredRowPlanned: ProjectedOutcome[] = deferred > 0 ? [{ label: 'Would defer (until IRAS clears)', value: money(deferred), tone: 'neutral' }] : [];
  const projectedOutcome: ProjectedOutcome[] = [
    { label: 'Moved to goals now', value: money(movedNow), tone: 'good' },
    ...deferredRow,
    btoRow,
  ];
  const projectedOutcomePlanned: ProjectedOutcome[] = [
    { label: 'Would move to goals now', value: money(movedNow), tone: 'good' },
    ...deferredRowPlanned,
    btoRow,
  ];

  return {
    agentId: 'cashflow',
    scenario: 'salary-allocation',
    kind: 'action-taken',
    title: tight ? 'Payday — split adjusted around your tax bill' : 'Payday — I split it the way you set',
    summary: tight
      ? `${money(salary)} landed. Your rule is ${money(baseTotal)} to goals, but IRAS is due in days — so I moved the priority ${money(movedNow)} to your BTO goal now and will auto-move the remaining ${money(deferred)} once tax clears.`
      : `${money(salary)} landed. I split ${money(movedNow)} across your goals exactly as you set and left the rest for spending.`,
    reasoning,
    confidence: 0.9,
    dataUsed: ['Salary credit', 'Your allocation rule', '30-day forecast', 'Goal balances'],
    projectedOutcome,
    action: { type: 'allocateSalary', label: `Allocate ${money(movedNow)} to goals`, params: { fromId: 'acc_current', splits }, reversible: true },
    choices: [
      { id: 'keep', label: 'Looks good', kind: 'primary', resolvesTo: 'approved' },
      { id: 'undo', label: 'Undo', kind: 'secondary', resolvesTo: 'reverted' },
    ],
    resolutionCopy: {
      approved: `Done — ${money(movedNow)} is in your goals${deferred > 0 ? `, and I’ll move the ${money(deferred)} after IRAS clears` : ''}.`,
      reverted: `I took the ${money(movedNow)} back out of your goals — your Everyday Account is exactly as before.`,
      rejected: `Okay — this month’s pay stays put. Your allocation rule is untouched for next time.`,
    },
    priority: 2,
    voices: {
      suggested: {
        title: tight ? 'Payday — a split adjusted around your tax bill, one tap away' : 'Payday — ready to split it the way you set',
        summary: tight
          ? `${money(salary)} landed. Your rule sends ${money(baseTotal)} to goals, but IRAS is due in days — so the plan is the priority ${money(movedNow)} to your BTO goal now and the remaining ${money(deferred)} once tax clears. One tap and it's done.`
          : `${money(salary)} landed. Your rule sends ${money(movedNow)} to your goals — everything is prepared and one tap away.`,
        reasoning: reasoningPlanned,
        projectedOutcome: projectedOutcomePlanned,
      },
      observed: {
        title: 'Payday spotted — allocation noted, not made',
        summary: tight
          ? `${money(salary)} landed. Your rule would send ${money(baseTotal)} to goals — the priority ${money(movedNow)} to BTO first with IRAS due, then ${money(deferred)} after tax — but I'm in Observe, so I've only noted it. Nothing moved.`
          : `${money(salary)} landed. Your rule would send ${money(movedNow)} to your goals — but I'm in Observe, so I've only noted it. Nothing moved.`,
        reasoning: reasoningPlanned,
        projectedOutcome: projectedOutcomePlanned,
      },
    },
  };
}
