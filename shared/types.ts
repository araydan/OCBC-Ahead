// ─────────────────────────────────────────────────────────────────────────────
// OCBC Ahead — core domain model
// Shared by the offline frontend engine AND the optional Anthropic backend.
// ─────────────────────────────────────────────────────────────────────────────

export type Currency = 'SGD' | 'USD' | 'JPY';

export type AccountType =
  | 'current' | '360' | 'fixed-deposit' | 'credit-card' | 'multi-currency' | 'home-loan';

export interface Account {
  id: string;
  type: AccountType;
  name: string;
  mask: string; // e.g. "•• 4821"
  balance: number;
  currency: Currency;
  apy?: number; // annual yield as a ratio, e.g. 0.0005 or 0.032
  dueDate?: string; // credit card statement due date
  moneyLock?: boolean; // OCBC Money Lock engaged
}

export type TxnCategory =
  | 'income' | 'housing' | 'insurance' | 'tax' | 'family' | 'utilities'
  | 'food' | 'transport' | 'shopping' | 'travel' | 'subscription'
  | 'transfer' | 'savings' | 'investment' | 'other';

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO
  amount: number; // negative = outflow, positive = inflow
  merchant: string;
  category: TxnCategory;
  recurring?: boolean;
}

/** A known, upcoming debit or credit — the basis for cashflow forecasting. */
export interface ScheduledItem {
  id: string;
  label: string;
  amount: number; // negative = bill, positive = income
  date: string;
  category: TxnCategory;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  saved: number;
  targetDate: string;
}

/** A transfer the customer initiated that has NOT yet settled (used by Protection). */
export interface PendingTransfer {
  id: string;
  fromId: string;
  payee: string;
  amount: number;
  channel: 'PayNow' | 'FAST' | 'Overseas';
  initiatedAt: string;
  status: 'held' | 'released' | 'blocked';
}

/** The living, continuously-updated financial profile. */
export interface FinancialState {
  asOf: string; // simulated "now"
  personaId: string;
  monthlyIncome: number;
  comfortBuffer: number; // the cash cushion the customer wants kept liquid
  accounts: Account[];
  transactions: Transaction[];
  scheduled: ScheduledItem[];
  goals: Goal[];
  pendingTransfers: PendingTransfer[];
}

// ── Agents ───────────────────────────────────────────────────────────────────

export type AgentId = 'yield' | 'cashflow' | 'protection' | 'fxTravel' | 'lifeEvent' | 'debt';

export type AutonomyMode = 'observe' | 'suggest' | 'auto';

export interface AgentLimits {
  maxAutoMoveSGD?: number; // Yield: auto-move idle cash up to…
  maxAutoAllocateSGD?: number; // Cashflow: auto-allocate salary up to…
  maxAutoFxSGD?: number; // FX: auto-lock up to…
}

export interface AgentConfig {
  id: AgentId;
  mode: AutonomyMode;
  limits: AgentLimits;
}

export interface AgentMeta {
  id: AgentId;
  name: string;
  blurb: string;
  emoji: string;
  accent: string; // hex
}

// ── Proposals (what an agent produces) ───────────────────────────────────────

/** Intent the agent expresses; the orchestrator + policy decide the final kind. */
export type ProposalKind =
  | 'action-taken' // auto-executed within limits (reversible)
  | 'needs-approval' // awaiting the customer's one-tap
  | 'protection-alert' // protective auto-pause + confirm/block
  | 'human-handoff' // escalated to a human RM
  | 'insight'; // observe-only note

export type ProposalStatus =
  | 'auto-executed' | 'pending' | 'approved' | 'rejected'
  | 'reverted' | 'escalated' | 'blocked' | 'confirmed' | 'noted';

export interface ReasoningStep {
  label: string;
  detail: string;
}

export interface ProjectedOutcome {
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'neutral';
}

export type ActionType =
  | 'openFixedDeposit' | 'moveFunds' | 'allocateSalary'
  | 'pauseTransfer' | 'lockFxRate' | 'escalateToHuman' | 'deferBill' | 'none';

export interface Action {
  type: ActionType;
  label: string;
  params: Record<string, any>;
  reversible: boolean;
}

export interface ProposalChoice {
  id: string;
  label: string;
  kind: 'primary' | 'secondary' | 'danger';
  resolvesTo: ProposalStatus;
}

/** Partial copy override applied when a proposal's final disposition differs
 * from the voice its draft was authored in. */
export interface VoicePatch {
  title?: string;
  summary?: string;
  reasoning?: ReasoningStep[];
  projectedOutcome?: ProjectedOutcome[];
}

/** What an agent returns from evaluate(). The orchestrator stamps the rest. */
export interface ProposalDraft {
  agentId: AgentId;
  scenario: ScenarioId;
  kind: ProposalKind; // intent
  title: string;
  summary: string;
  reasoning: ReasoningStep[];
  confidence: number; // 0..1
  dataUsed: string[];
  projectedOutcome: ProjectedOutcome[];
  action?: Action;
  choices?: ProposalChoice[];
  priority?: number; // higher = more urgent (used in conflict resolution)
  /** Copy variants for when the policy routes this draft to a different
   * disposition than the voice it was authored in (e.g. an intended action
   * demoted to a suggestion or an observation). The orchestrator swaps these
   * in based on the FINAL kind; a missing variant keeps the authored copy. */
  voices?: {
    acted?: VoicePatch;
    suggested?: VoicePatch;
    observed?: VoicePatch;
  };
}

export interface AgentProposal extends ProposalDraft {
  id: string;
  createdAt: string; // simulated time
  status: ProposalStatus;
  policy: PolicyDecision; // the WHY behind auto vs ask vs observe
}

// ── Autonomy policy engine ───────────────────────────────────────────────────

export type PolicyOutcome = 'auto-execute' | 'needs-approval' | 'observe-only';

export interface LimitCheck {
  name: string;
  limit: number;
  requested: number;
  within: boolean;
}

export interface PolicyDecision {
  outcome: PolicyOutcome;
  mode: AutonomyMode;
  reason: string; // plain-English, shown to the customer
  limitCheck?: LimitCheck;
  aboveComfortLine?: boolean; // Suggest mode, above your comfort line → offer approve / book-RM / not-now
}

// ── Audit ────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  at: string; // simulated time
  agentId: AgentId;
  proposalId: string;
  title: string;
  detail: string;
  action?: Action;
  reversible: boolean;
  reverted: boolean;
  confidence: number;
  meta?: Record<string, any>; // e.g. created FD id, for reversal
}

// ── Time engine / events ─────────────────────────────────────────────────────

export type ScenarioId =
  | 'idle-cash' | 'salary-allocation' | 'cashflow-shortfall'
  | 'scam-protection' | 'fx-travel' | 'human-handoff';

export type SimEventType =
  | 'idle-cash' | 'salary' | 'bill-forecast' | 'outgoing-transfer'
  | 'travel-signal' | 'refinance-signal';

export interface SimEvent {
  id: string;
  at: string; // simulated time it should fire
  type: SimEventType;
  scenario: ScenarioId;
  label: string; // for the demo control panel
  note: string; // one-liner describing what the judge will see
  payload: Record<string, any>;
}
