// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator — routes each event to the specialist agents, resolves conflicts
// between them, runs every proposed action through the autonomy policy engine,
// executes (or escalates) accordingly, and writes the audit trail.
// Agents propose; the orchestrator disposes. Nothing touches money without
// passing decidePolicy() first.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  AgentConfig, AgentId, AgentProposal, AuditEntry, FinancialState,
  PolicyDecision, ProposalDraft, ProposalKind, ProposalStatus, SimEvent,
} from '../types';
import { AGENTS } from './registry';
import { decidePolicy } from './policy';
import { applyAction } from '../tools';
import { applyEnvEvent } from '../events';
import { uid } from '../util';

export interface DispatchResult {
  proposals: AgentProposal[]; // newest-relevant first
  audit: AuditEntry[];
  state: FinancialState; // after any auto-executed side effects
}

interface Route {
  kind: ProposalKind;
  status: ProposalStatus;
  execute: boolean;
  escalate: boolean;
}

/** Above the comfort line in Suggest mode: the agent has prepared its action but
 * won't run it unilaterally. Keep its analysis AND its suggested action, and give
 * the customer three doors — approve it now, bring in a human RM, or leave it. */
function offerThreeOptions(p: AgentProposal): AgentProposal {
  return {
    ...p,
    reasoning: [
      ...p.reasoning,
      { label: 'Above your comfort line', detail: "Bigger than the amount you marked okay to wave through in one tap — so the call stays yours: approve it, bring in a human RM, or leave it for now." },
    ],
    choices: [
      { id: 'approve', label: 'Approve', kind: 'primary', resolvesTo: 'approved' },
      { id: 'book', label: 'Book a call with an RM', kind: 'secondary', resolvesTo: 'escalated' },
      { id: 'notnow', label: 'Not now', kind: 'secondary', resolvesTo: 'rejected' },
    ],
  };
}

/** Map an agent's intent + the policy decision to what actually happens. */
function route(draft: ProposalDraft, policy: PolicyDecision): Route {
  switch (draft.kind) {
    case 'protection-alert':
      // Safety-critical: auto-pause (protective) always runs; resolution waits for the human.
      return { kind: 'protection-alert', status: 'pending', execute: true, escalate: false };
    case 'human-handoff':
      return { kind: 'human-handoff', status: 'escalated', execute: false, escalate: true };
    case 'insight':
      return { kind: 'insight', status: 'noted', execute: false, escalate: false };
    case 'action-taken':
      if (policy.outcome === 'auto-execute') return { kind: 'action-taken', status: 'auto-executed', execute: true, escalate: false };
      if (policy.outcome === 'needs-approval') return { kind: 'needs-approval', status: 'pending', execute: false, escalate: false };
      return { kind: 'insight', status: 'noted', execute: false, escalate: false };
    case 'needs-approval':
      if (policy.outcome === 'observe-only') return { kind: 'insight', status: 'noted', execute: false, escalate: false };
      return { kind: 'needs-approval', status: 'pending', execute: false, escalate: false };
    default:
      return { kind: 'insight', status: 'noted', execute: false, escalate: false };
  }
}

/** Lightweight cross-agent conflict resolution. */
function resolveConflicts(drafts: ProposalDraft[], _state: FinancialState): ProposalDraft[] {
  const shortfall = drafts.find((d) => d.scenario === 'cashflow-shortfall');
  const yieldMove = drafts.find((d) => d.agentId === 'yield' && d.action?.type === 'openFixedDeposit');
  if (shortfall && yieldMove) {
    yieldMove.reasoning.push({
      label: 'Orchestrator override',
      detail: 'Cashflow Agent flagged a shortfall this period — I deferred part of the yield move to keep you liquid.',
    });
  }
  // Sort so the most urgent proposals surface first in the feed.
  return [...drafts].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function dispatch(
  event: SimEvent,
  state: FinancialState,
  configs: Record<AgentId, AgentConfig>,
): DispatchResult {
  // 1. Apply the environmental change the event represents (salary in, flight charged, transfer attempted).
  let s = applyEnvEvent(state, event);

  // 2. Fan the event out to every specialist agent.
  const drafts = AGENTS
    .map((a) => a.evaluate(event, { state: s, config: configs[a.meta.id] }))
    .filter((d): d is ProposalDraft => Boolean(d));

  // 3. Resolve conflicts / prioritise.
  const resolved = resolveConflicts(drafts, s);

  // 4. Policy gate → execute / ask / escalate / observe, logging every action.
  const proposals: AgentProposal[] = [];
  const audit: AuditEntry[] = [];

  for (const draft of resolved) {
    const config = configs[draft.agentId];
    const policy = decidePolicy(draft.action, config, draft.kind);
    const r = route(draft, policy);

    // The draft's copy was authored in one voice (usually its default mode's).
    // If the policy routed the card to a different disposition, swap in the
    // variant that tells the truth about what actually happened.
    const voice =
      r.kind === 'action-taken'
        ? draft.voices?.acted
        : r.kind === 'needs-approval'
          ? draft.voices?.suggested
          : r.kind === 'insight'
            ? draft.voices?.observed
            : undefined;

    const base: AgentProposal = {
      ...draft,
      ...voice,
      kind: r.kind,
      id: uid('prop'),
      createdAt: event.at,
      status: r.status,
      policy,
    };
    const proposal = policy.aboveComfortLine ? offerThreeOptions(base) : base;

    if (r.execute && draft.action) {
      const res = applyAction(s, draft.action);
      if (res.ok) {
        s = res.state;
        audit.push({
          id: uid('aud'),
          at: event.at,
          agentId: draft.agentId,
          proposalId: proposal.id,
          title: draft.title,
          detail: res.detail,
          action: draft.action,
          reversible: draft.action.reversible,
          reverted: false,
          confidence: draft.confidence,
          meta: res.meta,
        });
      }
    } else if (r.escalate) {
      audit.push({
        id: uid('aud'),
        at: event.at,
        agentId: draft.agentId,
        proposalId: proposal.id,
        title: draft.title,
        detail: 'Escalated to a relationship manager with full context.',
        action: draft.action,
        reversible: false,
        reverted: false,
        confidence: draft.confidence,
      });
    }

    proposals.push(proposal);
  }

  return { proposals, audit, state: s };
}
