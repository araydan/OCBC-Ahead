import type { AgentConfig, AgentId, AgentMeta } from '../types';
import type { Agent } from './base';
import { yieldAgent } from './yield.agent';
import { cashflowAgent } from './cashflow.agent';
import { protectionAgent } from './protection.agent';
import { fxTravelAgent } from './fxTravel.agent';
import { lifeEventAgent } from './lifeEvent.agent';
import { debtAgent } from './debt.agent';

/** The team of specialist agents the orchestrator dispatches to. */
export const AGENTS: Agent[] = [
  yieldAgent,
  cashflowAgent,
  protectionAgent,
  fxTravelAgent,
  lifeEventAgent,
  debtAgent,
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.meta.id, a])) as Record<AgentId, Agent>;
export const AGENT_META = Object.fromEntries(AGENTS.map((a) => [a.meta.id, a.meta])) as Record<AgentId, AgentMeta>;
export const DEFAULT_CONFIGS = Object.fromEntries(AGENTS.map((a) => [a.meta.id, a.defaultConfig])) as Record<AgentId, AgentConfig>;
export const AGENT_ORDER: AgentId[] = AGENTS.map((a) => a.meta.id);
