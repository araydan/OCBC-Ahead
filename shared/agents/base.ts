import type { AgentConfig, AgentMeta, FinancialState, ProposalDraft, SimEvent } from '../types';

export interface AgentContext {
  state: FinancialState;
  config: AgentConfig;
}

/**
 * A specialist agent. Given an event and the current financial state (plus the
 * customer's autonomy config), it either has something to propose or stays silent.
 * Agents NEVER execute actions themselves — they only draft proposals. The
 * orchestrator + policy engine decide what actually runs. This is what keeps the
 * human in control.
 */
export interface Agent {
  meta: AgentMeta;
  defaultConfig: AgentConfig;
  evaluate(event: SimEvent, ctx: AgentContext): ProposalDraft | null;
}
