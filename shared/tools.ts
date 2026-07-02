// ─────────────────────────────────────────────────────────────────────────────
// Mocked OCBC banking primitives — the "action layer".
// Every mutation is pure (returns a NEW state), returns a human-readable detail,
// and is reversible via revertAction(). In production these would be real OCBC
// service calls (360 Account, Fixed Deposit, Money Lock, FX, Apply Hub, …).
// ─────────────────────────────────────────────────────────────────────────────
import type { Account, Action, FinancialState } from './types';
import { money, pct, uid } from './util';

export interface ToolResult {
  state: FinancialState;
  detail: string;
  ok: boolean;
  meta?: Record<string, any>;
}

const clone = (s: FinancialState): FinancialState => structuredClone(s);
const find = (s: FinancialState, id: string): Account | undefined => s.accounts.find((a) => a.id === id);

export function getAccounts(state: FinancialState): Account[] {
  return state.accounts;
}

/** Move idle cash into a new OCBC Fixed Deposit at a board rate. */
export function openFixedDeposit(
  state: FinancialState,
  p: { fromId: string; amount: number; tenorMonths: number; apy: number },
): ToolResult {
  const s = clone(state);
  const from = find(s, p.fromId);
  if (!from || from.balance < p.amount) return { state, ok: false, detail: 'Insufficient funds.' };
  from.balance -= p.amount;
  const fdId = uid('fd');
  s.accounts.push({
    id: fdId,
    type: 'fixed-deposit',
    name: `${p.tenorMonths}-Month Fixed Deposit`,
    mask: '•• FD',
    balance: p.amount,
    currency: 'SGD',
    apy: p.apy,
  });
  return {
    state: s,
    ok: true,
    detail: `Opened a ${p.tenorMonths}-month Fixed Deposit of ${money(p.amount)} at ${pct(p.apy)} from ${from.name}.`,
    meta: { fdId, fromId: p.fromId, amount: p.amount },
  };
}

/** Generic transfer between the customer's own accounts. */
export function moveFunds(
  state: FinancialState,
  p: { fromId: string; toId: string; amount: number },
): ToolResult {
  const s = clone(state);
  const from = find(s, p.fromId);
  const to = find(s, p.toId);
  if (!from || !to || from.balance < p.amount) return { state, ok: false, detail: 'Move failed.' };
  from.balance -= p.amount;
  to.balance += p.amount;
  return {
    state: s,
    ok: true,
    detail: `Moved ${money(p.amount)} from ${from.name} to ${to.name}.`,
    meta: { fromId: p.fromId, toId: p.toId, amount: p.amount },
  };
}

/** Split a paycheck across goals, within the customer's guardrails. */
export function allocateSalary(
  state: FinancialState,
  p: { fromId: string; splits: { goalId: string; amount: number }[] },
): ToolResult {
  const s = clone(state);
  const from = find(s, p.fromId);
  const total = p.splits.reduce((t, x) => t + x.amount, 0);
  if (!from || from.balance < total) return { state, ok: false, detail: 'Allocation failed.' };
  from.balance -= total;
  for (const split of p.splits) {
    const goal = s.goals.find((g) => g.id === split.goalId);
    if (goal) goal.saved += split.amount;
  }
  return {
    state: s,
    ok: true,
    detail: `Allocated ${money(total)} across ${p.splits.length} goals from ${from.name}.`,
    meta: { fromId: p.fromId, splits: p.splits },
  };
}

/** Hold a suspicious outgoing transfer using OCBC Money Lock. */
export function pauseTransfer(state: FinancialState, p: { transferId: string }): ToolResult {
  const s = clone(state);
  const t = s.pendingTransfers.find((x) => x.id === p.transferId);
  if (!t) return { state, ok: false, detail: 'No such transfer.' };
  t.status = 'held';
  const acc = find(s, t.fromId);
  if (acc) acc.moneyLock = true;
  return { state: s, ok: true, detail: `Held ${money(t.amount)} to ${t.payee} via Money Lock.`, meta: { transferId: t.id } };
}

/** Customer confirms a held transfer is genuine — release and settle it. */
export function releaseTransfer(state: FinancialState, p: { transferId: string }): ToolResult {
  const s = clone(state);
  const t = s.pendingTransfers.find((x) => x.id === p.transferId);
  if (!t) return { state, ok: false, detail: 'No such transfer.' };
  const from = find(s, t.fromId);
  if (!from || from.balance < t.amount) return { state, ok: false, detail: 'Release failed.' };
  from.balance -= t.amount;
  t.status = 'released';
  return { state: s, ok: true, detail: `Released and settled ${money(t.amount)} to ${t.payee}.` };
}

/** Customer (or agent, with confirmation) blocks a fraudulent transfer. */
export function blockTransfer(state: FinancialState, p: { transferId: string }): ToolResult {
  const s = clone(state);
  const t = s.pendingTransfers.find((x) => x.id === p.transferId);
  if (!t) return { state, ok: false, detail: 'No such transfer.' };
  t.status = 'blocked';
  return { state: s, ok: true, detail: `Blocked ${money(t.amount)} to ${t.payee} and reported it.` };
}

/** Lock an FX rate for an upcoming trip (mock: no balance change until spent). */
export function lockFxRate(
  state: FinancialState,
  p: { pair: string; sgdAmount: number; rate: number },
): ToolResult {
  return {
    state,
    ok: true,
    detail: `Locked ${p.pair} at ${p.rate} for ${money(p.sgdAmount)}.`,
    meta: { ...p },
  };
}

export function escalateToHuman(state: FinancialState, p: { topic: string }): ToolResult {
  return { state, ok: true, detail: `Escalated "${p.topic}" to a relationship manager with full context.`, meta: { ...p } };
}

/** Dispatch an Action to its tool. Used by the orchestrator and the store. */
export function applyAction(state: FinancialState, action: Action): ToolResult {
  switch (action.type) {
    case 'openFixedDeposit': return openFixedDeposit(state, action.params as any);
    case 'moveFunds': return moveFunds(state, action.params as any);
    case 'allocateSalary': return allocateSalary(state, action.params as any);
    case 'pauseTransfer': return pauseTransfer(state, action.params as any);
    case 'lockFxRate': return lockFxRate(state, action.params as any);
    case 'escalateToHuman': return escalateToHuman(state, action.params as any);
    default: return { state, ok: true, detail: '' };
  }
}

/** Reverse a previously executed action (the "every action is reversible" promise). */
export function revertAction(state: FinancialState, action: Action, meta?: Record<string, any>): ToolResult {
  const s = clone(state);
  switch (action.type) {
    case 'openFixedDeposit': {
      const idx = s.accounts.findIndex((a) => a.id === meta?.fdId);
      const from = find(s, meta?.fromId);
      if (idx === -1 || !from) return { state, ok: false, detail: 'Nothing to revert.' };
      from.balance += meta!.amount;
      s.accounts.splice(idx, 1);
      return { state: s, ok: true, detail: `Reversed the Fixed Deposit — ${money(meta!.amount)} back in ${from.name}.` };
    }
    case 'moveFunds': {
      const from = find(s, meta?.fromId);
      const to = find(s, meta?.toId);
      if (!from || !to) return { state, ok: false, detail: 'Nothing to revert.' };
      to.balance -= meta!.amount;
      from.balance += meta!.amount;
      return { state: s, ok: true, detail: `Reversed the transfer of ${money(meta!.amount)}.` };
    }
    case 'allocateSalary': {
      const from = find(s, meta?.fromId);
      if (!from) return { state, ok: false, detail: 'Nothing to revert.' };
      let total = 0;
      for (const split of (meta?.splits ?? []) as { goalId: string; amount: number }[]) {
        const goal = s.goals.find((g) => g.id === split.goalId);
        if (goal) goal.saved -= split.amount;
        total += split.amount;
      }
      from.balance += total;
      return { state: s, ok: true, detail: `Reversed the salary allocation of ${money(total)}.` };
    }
    default:
      return { state, ok: true, detail: 'Reverted.' };
  }
}

// ── Forecasting primitive ────────────────────────────────────────────────────

export interface CashflowForecast {
  horizonDays: number;
  startBalance: number;
  projectedLow: number;
  lowDate: string;
  belowBuffer: boolean;
  buffer: number;
  upcoming: { label: string; amount: number; date: string }[];
}

/**
 * Project the running balance of an account over a horizon using scheduled items.
 * This is what lets agents anticipate instead of react.
 */
export function forecastCashflow(
  state: FinancialState,
  accountId: string,
  horizonDays = 30,
  startOverride?: number,
): CashflowForecast {
  const acc = find(state, accountId);
  const start = startOverride ?? acc?.balance ?? 0;
  const end = new Date(state.asOf);
  end.setDate(end.getDate() + horizonDays);

  const upcoming = state.scheduled
    .filter((x) => new Date(x.date) > new Date(state.asOf) && new Date(x.date) <= end)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  let running = start;
  let low = start;
  let lowDate = state.asOf;
  for (const item of upcoming) {
    running += item.amount;
    if (running < low) {
      low = running;
      lowDate = item.date;
    }
  }
  return {
    horizonDays,
    startBalance: start,
    projectedLow: low,
    lowDate,
    buffer: state.comfortBuffer,
    belowBuffer: low < state.comfortBuffer,
    upcoming: upcoming.map((x) => ({ label: x.label, amount: x.amount, date: x.date })),
  };
}
