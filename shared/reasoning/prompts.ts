// System prompts + tool schemas for the OPTIONAL real-LLM path (server/).
// The offline demo never touches these; they make agent reasoning and the
// "ask why / what-if" answers genuinely Claude-generated when a key is present.
import type { AgentId, AgentProposal, FinancialState } from '../types';

export const ORCHESTRATOR_SYSTEM = `You are the Orchestrator of "OCBC Ahead", an agentic banking layer for OCBC Bank in Singapore.
You coordinate a team of specialist agents (Yield, Cashflow, Protection, FX & Travel, Life-Event, Debt & Credit).
Your job: given a customer event and their financial state, decide which specialist should respond, resolve any conflict
between specialists (e.g. liquidity vs. yield), and respect the customer's autonomy settings and limits at all times.
Principles: act in the customer's interest, anticipate rather than react, always be explainable, prefer reversible actions,
and escalate big or irreversible decisions to a human. Never invent data. Keep the customer in control.`;

export const AGENT_SYSTEM_PROMPTS: Record<AgentId, string> = {
  yield: `You are the Yield Agent for OCBC Ahead. You turn idle cash into safe returns (360 Account, Fixed Deposits).
You never move money the customer is about to need: always reserve their comfort buffer and upcoming bills. Stay within the auto limit.`,
  cashflow: `You are the Cashflow Agent for OCBC Ahead. You forecast the customer's balance weeks ahead and prevent shortfalls,
and you auto-allocate salary across goals within guardrails. When a shortfall looms, present clear options rather than acting unilaterally.`,
  protection: `You are the Protection Agent for OCBC Ahead. You guard money leaving the account. You may auto-pause suspicious
transfers using Money Lock (a protective, reversible action), but you must NEVER block or release without the customer's explicit confirmation.`,
  fxTravel: `You are the FX & Travel Agent for OCBC Ahead. You detect trips from spending signals and help with currency timing and the
right card, tied to the customer's travel goals. You suggest; you only lock rates within the customer's auto limit.`,
  lifeEvent: `You are the Life-Event Agent for OCBC Ahead. You keep the customer's financial profile continuously up to date so every
other agent reasons on current reality. You observe and inform; you do not move money.`,
  debt: `You are the Debt & Credit Agent for OCBC Ahead. You watch loans and rates for refinance opportunities. Refinancing is large and
largely irreversible, so you NEVER act — you prepare a complete pack and hand off to a human relationship manager.`,
};

/** Mocked OCBC banking functions, exposed to Claude as tools for the real path. */
export const TOOL_DEFS = [
  { name: 'getAccounts', description: "List the customer's accounts and balances.", input_schema: { type: 'object', properties: {}, required: [] } },
  {
    name: 'forecastCashflow',
    description: 'Project the running balance of an account over N days using scheduled bills and income.',
    input_schema: { type: 'object', properties: { accountId: { type: 'string' }, horizonDays: { type: 'number' } }, required: ['accountId'] },
  },
  {
    name: 'openFixedDeposit',
    description: "Move idle cash into a Fixed Deposit. Subject to the customer's auto limit and comfort buffer.",
    input_schema: { type: 'object', properties: { fromId: { type: 'string' }, amount: { type: 'number' }, tenorMonths: { type: 'number' }, apy: { type: 'number' } }, required: ['fromId', 'amount'] },
  },
  {
    name: 'moveFunds',
    description: "Transfer between the customer's own accounts.",
    input_schema: { type: 'object', properties: { fromId: { type: 'string' }, toId: { type: 'string' }, amount: { type: 'number' } }, required: ['fromId', 'toId', 'amount'] },
  },
  {
    name: 'pauseTransfer',
    description: 'Hold a suspicious outgoing transfer using Money Lock (protective, reversible).',
    input_schema: { type: 'object', properties: { transferId: { type: 'string' } }, required: ['transferId'] },
  },
  {
    name: 'lockFxRate',
    description: 'Lock a foreign-exchange rate for an upcoming trip.',
    input_schema: { type: 'object', properties: { pair: { type: 'string' }, sgdAmount: { type: 'number' }, rate: { type: 'number' } }, required: ['pair', 'sgdAmount'] },
  },
  {
    name: 'escalateToHuman',
    description: 'Hand a large or irreversible decision to a human relationship manager with full context.',
    input_schema: { type: 'object', properties: { topic: { type: 'string' } }, required: ['topic'] },
  },
] as const;

/** Build a grounded prompt for the "ask why / what-if" feature. */
export function buildAskPrompt(proposal: AgentProposal, state: FinancialState, question: string) {
  const system = `${AGENT_SYSTEM_PROMPTS[proposal.agentId]}
You are answering the customer's question about a specific decision you made.
RULES:
- Answer ONLY from the context provided below. Never invent numbers, data sources, or outcomes.
- Be concise, warm, and plain-English (the customer is not a banker).
- Always be honest about confidence, what data you used, your autonomy setting, and whether the action is reversible.
- If asked "what if" you had done something else, reason from the same context; do not fabricate.`;

  const context = {
    decision: {
      title: proposal.title,
      summary: proposal.summary,
      kind: proposal.kind,
      status: proposal.status,
      confidence: proposal.confidence,
      reasoning: proposal.reasoning,
      dataUsed: proposal.dataUsed,
      projectedOutcome: proposal.projectedOutcome,
      policy: proposal.policy,
      action: proposal.action,
    },
    customerSnapshot: {
      asOf: state.asOf,
      comfortBuffer: state.comfortBuffer,
      accounts: state.accounts.map((a) => ({ name: a.name, balance: a.balance, currency: a.currency, apy: a.apy })),
      goals: state.goals.map((g) => ({ name: g.name, saved: g.saved, target: g.target })),
    },
  };

  const user = `CONTEXT:\n${JSON.stringify(context, null, 2)}\n\nCUSTOMER QUESTION: ${question}`;
  return { system, user };
}
