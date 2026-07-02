// Demo personas + their scripted event timeline.
// Account/goal IDs are structural (the agents reference them), so both personas
// reuse the same IDs with different numbers and labels.
import type { FinancialState, SimEvent, Transaction } from './types';

export interface Persona {
  id: string;
  name: string;
  tagline: string;
  avatar: string;
  initialState: FinancialState;
  events: SimEvent[];
}

const DAY = '2026-06-21';
const ASOF = `${DAY}T08:30:00+08:00`;

interface EventTuning {
  idleRequest: number;
  scamAmount: number;
  scamTimes: number;
  avgPayNow: number;
  salary: number;
  loan: number;
  refiSaving: number;
}

/** Builds the same six-scenario timeline for any persona, scaled to their numbers. */
function makeEvents(t: EventTuning): SimEvent[] {
  return [
    {
      id: 'ev_idle',
      at: `${DAY}T07:45:00+08:00`, // before "now" → already done: "while you were away"
      type: 'idle-cash',
      scenario: 'idle-cash',
      label: 'Idle cash → yield',
      note: 'Agent moved idle SGD into a Fixed Deposit overnight, keeping your buffer liquid.',
      payload: { accountId: 'acc_current', idleDays: 64, targetApy: 0.032, requestedAmount: t.idleRequest },
    },
    {
      id: 'ev_forecast',
      at: `${DAY}T09:15:00+08:00`,
      type: 'bill-forecast',
      scenario: 'cashflow-shortfall',
      label: 'Predicted shortfall',
      note: 'Agent forecasts a dip before insurance + IRAS and offers options days ahead.',
      payload: {},
    },
    {
      id: 'ev_scam',
      at: `${DAY}T13:40:00+08:00`,
      type: 'outgoing-transfer',
      scenario: 'scam-protection',
      label: 'Scam transfer',
      note: 'Protection Agent pauses a suspicious transfer with Money Lock.',
      payload: { amount: t.scamAmount, payee: 'Jeremy Lim', channel: 'PayNow', timeLabel: '2:14 AM', timesAvg: t.scamTimes, payeeAddedMins: 4, avgAmount: t.avgPayNow },
    },
    {
      id: 'ev_travel',
      at: `2026-06-22T10:00:00+08:00`,
      type: 'travel-signal',
      scenario: 'fx-travel',
      label: 'Travel / FX',
      note: 'Agent spots a Tokyo trip and offers to lock a good ¥ rate.',
      payload: { destination: 'Tokyo', airline: 'Singapore Airlines', tripDate: '2026-09-12', pair: 'SGD/JPY', spotRate: 115.2, lockRate: 116.0, sgdLock: 2000, estSaving: 140, budgetJPY: 300000, flightAmount: 1180 },
    },
    {
      id: 'ev_salary',
      at: `2026-06-25T00:05:00+08:00`,
      type: 'salary',
      scenario: 'salary-allocation',
      label: 'Payday auto-allocation',
      note: 'Agent splits the paycheck within your guardrails, adapting to the tax bill.',
      payload: { amount: t.salary },
    },
    {
      id: 'ev_refi',
      at: `2026-06-26T09:00:00+08:00`,
      type: 'refinance-signal',
      scenario: 'human-handoff',
      label: 'Human handoff',
      note: 'Agent escalates a refinance opportunity to a human RM with full context.',
      payload: { currentRate: 0.041, newRate: 0.031, outstanding: t.loan, remainingYears: 18, monthlySaving: t.refiSaving },
    },
  ];
}

const marcusTxns: Transaction[] = [
  { id: 'tx1', accountId: 'acc_current', date: '2026-06-20T19:12:00+08:00', amount: -7.8, merchant: 'Starbucks', category: 'food' },
  { id: 'tx2', accountId: 'acc_current', date: '2026-06-19T08:30:00+08:00', amount: -12.5, merchant: 'Grab', category: 'transport' },
  { id: 'tx3', accountId: 'acc_current', date: '2026-06-18T20:05:00+08:00', amount: -86.4, merchant: 'NTUC FairPrice', category: 'food' },
  { id: 'tx4', accountId: 'acc_card', date: '2026-06-17T13:00:00+08:00', amount: -45.9, merchant: 'Shopee', category: 'shopping' },
  { id: 'tx5', accountId: 'acc_current', date: '2026-06-15T00:00:00+08:00', amount: -16.98, merchant: 'Spotify', category: 'subscription' },
  { id: 'tx6', accountId: 'acc_current', date: '2026-06-05T09:00:00+08:00', amount: -2150, merchant: 'Home loan (GIRO)', category: 'housing', recurring: true },
  { id: 'tx7', accountId: 'acc_current', date: '2026-05-28T09:00:00+08:00', amount: -800, merchant: "Mum (PayNow)", category: 'family', recurring: true },
  { id: 'tx8', accountId: 'acc_current', date: '2026-05-25T00:05:00+08:00', amount: 7200, merchant: 'Salary credit', category: 'income', recurring: true },
];

export const MARCUS: Persona = {
  id: 'marcus',
  name: 'Marcus Tan',
  tagline: '32 · Software engineer · Singapore',
  avatar: '🧑🏻‍💻',
  initialState: {
    asOf: ASOF,
    personaId: 'marcus',
    monthlyIncome: 7200,
    comfortBuffer: 16500,
    accounts: [
      { id: 'acc_current', type: 'current', name: 'Everyday Account', mask: '•• 4821', balance: 38500, currency: 'SGD', apy: 0.0005, moneyLock: false },
      { id: 'acc_360', type: '360', name: 'OCBC 360 Account', mask: '•• 7245', balance: 15000, currency: 'SGD', apy: 0.024 },
      { id: 'acc_card', type: 'credit-card', name: '365 Credit Card', mask: '•• 9982', balance: -1240, currency: 'SGD', dueDate: '2026-07-03' },
      { id: 'acc_gca', type: 'multi-currency', name: 'Global Currency (USD)', mask: '•• USD', balance: 200, currency: 'USD' },
      { id: 'acc_loan', type: 'home-loan', name: 'Home Loan', mask: '•• HL', balance: -420000, currency: 'SGD', apy: 0.041 },
    ],
    transactions: marcusTxns,
    scheduled: [
      { id: 'sch_ins', label: 'Insurance premium', amount: -3800, date: '2026-06-24T09:00:00+08:00', category: 'insurance' },
      { id: 'sch_sal', label: 'Salary', amount: 7200, date: '2026-06-25T00:05:00+08:00', category: 'income' },
      { id: 'sch_util', label: 'SP Utilities', amount: -185, date: '2026-06-27T09:00:00+08:00', category: 'utilities' },
      { id: 'sch_iras', label: 'IRAS income tax', amount: -6900, date: '2026-06-28T09:00:00+08:00', category: 'tax' },
      { id: 'sch_fam', label: "Parents' allowance", amount: -800, date: '2026-06-28T09:00:00+08:00', category: 'family' },
      { id: 'sch_sub', label: 'Subscriptions', amount: -45, date: '2026-06-29T00:00:00+08:00', category: 'subscription' },
      { id: 'sch_loan', label: 'Home loan', amount: -2150, date: '2026-07-05T09:00:00+08:00', category: 'housing' },
    ],
    goals: [
      { id: 'goal_bto', name: 'BTO renovation', emoji: '🏠', target: 50000, saved: 22000, targetDate: '2027-12-31' },
      { id: 'goal_japan', name: 'Japan trip', emoji: '🗾', target: 6000, saved: 3100, targetDate: '2026-09-01' },
      { id: 'goal_emergency', name: 'Emergency fund', emoji: '🛟', target: 30000, saved: 19000, targetDate: '2026-12-31' },
    ],
    pendingTransfers: [],
  },
  events: makeEvents({ idleRequest: 25000, scamAmount: 4500, scamTimes: 25, avgPayNow: 180, salary: 7200, loan: 420000, refiSaving: 320 }),
};

const priyaTxns: Transaction[] = [
  { id: 'ptx1', accountId: 'acc_current', date: '2026-06-20T12:00:00+08:00', amount: -18.5, merchant: 'Toast Box', category: 'food' },
  { id: 'ptx2', accountId: 'acc_current', date: '2026-06-16T15:00:00+08:00', amount: 2400, merchant: 'Client invoice', category: 'income' },
  { id: 'ptx3', accountId: 'acc_card', date: '2026-06-14T10:00:00+08:00', amount: -64.0, merchant: 'Figma', category: 'subscription', recurring: true },
];

export const PRIYA: Persona = {
  id: 'priya',
  name: 'Priya Menon',
  tagline: '29 · Freelance designer · Singapore',
  avatar: '🧑🏽‍🎨',
  initialState: {
    asOf: ASOF,
    personaId: 'priya',
    monthlyIncome: 4800,
    comfortBuffer: 8000,
    accounts: [
      { id: 'acc_current', type: 'current', name: 'Everyday Account', mask: '•• 3310', balance: 12400, currency: 'SGD', apy: 0.0005, moneyLock: false },
      { id: 'acc_360', type: '360', name: 'OCBC 360 Account', mask: '•• 1180', balance: 5200, currency: 'SGD', apy: 0.018 },
      { id: 'acc_card', type: 'credit-card', name: '365 Credit Card', mask: '•• 4471', balance: -890, currency: 'SGD', dueDate: '2026-07-02' },
      { id: 'acc_gca', type: 'multi-currency', name: 'Global Currency (USD)', mask: '•• USD', balance: 50, currency: 'USD' },
      { id: 'acc_loan', type: 'home-loan', name: 'Home Loan', mask: '•• HL', balance: -280000, currency: 'SGD', apy: 0.039 },
    ],
    transactions: priyaTxns,
    scheduled: [
      { id: 'sch_ins', label: 'Insurance premium', amount: -1800, date: '2026-06-24T09:00:00+08:00', category: 'insurance' },
      { id: 'sch_sal', label: 'Client invoice', amount: 4800, date: '2026-06-25T00:05:00+08:00', category: 'income' },
      { id: 'sch_iras', label: 'IRAS income tax', amount: -4200, date: '2026-06-28T09:00:00+08:00', category: 'tax' },
      { id: 'sch_loan', label: 'Home loan', amount: -1180, date: '2026-07-05T09:00:00+08:00', category: 'housing' },
    ],
    goals: [
      { id: 'goal_bto', name: 'Studio fund', emoji: '🎨', target: 30000, saved: 9000, targetDate: '2027-06-30' },
      { id: 'goal_japan', name: 'Japan trip', emoji: '🗾', target: 5000, saved: 1500, targetDate: '2026-09-01' },
      { id: 'goal_emergency', name: 'Emergency fund', emoji: '🛟', target: 20000, saved: 7000, targetDate: '2026-12-31' },
    ],
    pendingTransfers: [],
  },
  events: makeEvents({ idleRequest: 6000, scamAmount: 2800, scamTimes: 18, avgPayNow: 150, salary: 4800, loan: 280000, refiSaving: 180 }),
};

export const PERSONAS: Record<string, Persona> = { marcus: MARCUS, priya: PRIYA };
export const DEFAULT_PERSONA_ID = 'marcus';
