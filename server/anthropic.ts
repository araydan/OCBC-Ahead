// Real-LLM reasoning, powered by Claude via the official Anthropic SDK.
// Two surfaces:
//   askAgent() — grounded "why / what-if" answers for the in-app Ask panel.
//   reason()   — a genuine multi-agent tool-use loop: the orchestrator inspects
//                the customer's accounts/cashflow with mocked OCBC tools, then
//                decides and explains. This is the "real path" the brief asks for.
import Anthropic from '@anthropic-ai/sdk';
import type { AgentProposal, FinancialState, SimEvent } from '../shared/types';
import { buildAskPrompt, ORCHESTRATOR_SYSTEM, TOOL_DEFS } from '../shared/reasoning/prompts';
import { applyAction, forecastCashflow, getAccounts } from '../shared/tools';

// Sonnet 4.6 — strong + cost-efficient for the in-app "why / what-if" answers.
// Override with ANTHROPIC_MODEL (e.g. claude-opus-4-8 for max capability, claude-haiku-4-5 for lowest cost).
export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export const hasKey = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

let _client: Anthropic | null = null;
const client = (): Anthropic => (_client ??= new Anthropic());

/** Grounded, plain-English answer as the deciding agent — used by the Ask panel. */
export async function askAgent(proposal: AgentProposal, state: FinancialState, question: string): Promise<string> {
  const { system, user } = buildAskPrompt(proposal, state, question);
  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 1024, // short, conversational answers
    system,
    messages: [{ role: 'user', content: user }],
  });
  return resp.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
    .trim();
}

/** Execute a tool the model asked for, against an ephemeral working copy of state. */
function executeTool(name: string, input: any, state: FinancialState): { detail: string; state: FinancialState } {
  switch (name) {
    case 'getAccounts':
      return {
        detail: JSON.stringify(getAccounts(state).map((a) => ({ id: a.id, name: a.name, balance: a.balance, currency: a.currency, apy: a.apy }))),
        state,
      };
    case 'forecastCashflow': {
      const f = forecastCashflow(state, input.accountId ?? 'acc_current', input.horizonDays ?? 30);
      return { detail: JSON.stringify(f), state };
    }
    default: {
      // openFixedDeposit / moveFunds / pauseTransfer / lockFxRate / escalateToHuman
      const r = applyAction(state, { type: name as any, label: name, params: input, reversible: true });
      return { detail: r.detail || 'done', state: r.state };
    }
  }
}

export interface ReasonResult {
  text: string;
  trace: { tool: string; input: any; result: string }[];
}

/** Multi-agent style tool-use loop. The orchestrator gathers context with real
 *  (mocked) banking tools before deciding — agent decisions are Claude-generated. */
export async function reason(event: SimEvent, state: FinancialState): Promise<ReasonResult> {
  let working = structuredClone(state);
  const trace: ReasonResult['trace'] = [];
  const messages: any[] = [
    {
      role: 'user',
      content: `A new event just arrived for the customer.
EVENT: ${JSON.stringify(event)}

Use your tools to inspect the customer's accounts and cashflow first, then decide the single best action (or escalate to a human if it's large or irreversible). Finally, explain your decision in 3-4 sentences a customer would understand — state your confidence and why it stays within their control.`,
    },
  ];

  for (let i = 0; i < 6; i++) {
    const resp = await client().messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: ORCHESTRATOR_SYSTEM,
      tools: TOOL_DEFS as any,
      messages,
    });

    if (resp.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: resp.content });
      const results: any[] = [];
      for (const block of resp.content as any[]) {
        if (block.type !== 'tool_use') continue;
        const out = executeTool(block.name, block.input, working);
        working = out.state;
        trace.push({ tool: block.name, input: block.input, result: out.detail });
        results.push({ type: 'tool_result', tool_use_id: block.id, content: out.detail });
      }
      messages.push({ role: 'user', content: results });
      continue;
    }

    const text = (resp.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return { text, trace };
  }

  return { text: 'Reasoning did not converge within the step limit.', trace };
}
