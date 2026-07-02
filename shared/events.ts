// Environment effects — the real-world change each event represents, applied to
// state BEFORE the agents look at it. (Salary lands, a flight is charged, a
// transfer is attempted.) The time engine in the store fires these in order.
import type { FinancialState, SimEvent } from './types';
import { uid } from './util';

export function applyEnvEvent(state: FinancialState, event: SimEvent): FinancialState {
  switch (event.type) {
    case 'salary': {
      const s = structuredClone(state);
      s.asOf = event.at;
      const acc = s.accounts.find((a) => a.id === 'acc_current');
      if (acc) acc.balance += event.payload.amount;
      s.transactions.unshift({
        id: uid('txn'),
        accountId: 'acc_current',
        date: event.at,
        amount: event.payload.amount,
        merchant: 'Salary credit',
        category: 'income',
      });
      return s;
    }
    case 'travel-signal': {
      const s = structuredClone(state);
      s.asOf = event.at;
      s.transactions.unshift({
        id: uid('txn'),
        accountId: 'acc_card',
        date: event.at,
        amount: -event.payload.flightAmount,
        merchant: event.payload.airline,
        category: 'travel',
      });
      return s;
    }
    case 'outgoing-transfer': {
      const s = structuredClone(state);
      s.asOf = event.at;
      s.pendingTransfers.push({
        id: uid('pt'),
        fromId: 'acc_current',
        payee: event.payload.payee,
        amount: event.payload.amount,
        channel: event.payload.channel,
        initiatedAt: event.at,
        status: 'held',
      });
      return s;
    }
    default: {
      // idle-cash / bill-forecast / refinance-signal carry no balance change.
      if (state.asOf === event.at) return state;
      const s = structuredClone(state);
      s.asOf = event.at;
      return s;
    }
  }
}
