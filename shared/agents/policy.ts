// ─────────────────────────────────────────────────────────────────────────────
// Autonomy Policy Engine — the heart of "humans in control".
// Every action an agent wants to take is checked HERE against the customer's
// per-agent mode (Observe → Suggest → Auto) and spending limits BEFORE it can run.
// ─────────────────────────────────────────────────────────────────────────────
import type { Action, AgentConfig, LimitCheck, PolicyDecision, ProposalKind } from '../types';
import { money } from '../util';

/** Which limit (if any) governs a given action, and whether the request is within it. */
export function checkLimit(action: Action, limits: AgentConfig['limits']): LimitCheck | null {
  switch (action.type) {
    case 'openFixedDeposit':
    case 'moveFunds':
      return mk('Auto-move idle cash', limits.maxAutoMoveSGD, action.params.amount);
    case 'allocateSalary':
      return mk(
        'Auto-allocate from salary',
        limits.maxAutoAllocateSGD,
        (action.params.splits ?? []).reduce((t: number, x: any) => t + x.amount, 0),
      );
    case 'lockFxRate':
      return mk('Auto-lock FX', limits.maxAutoFxSGD, action.params.sgdAmount);
    default:
      return null; // protective / human-handoff actions are not limit-gated this way
  }
}

function mk(name: string, limit: number | undefined, requested: number): LimitCheck {
  const lim = limit ?? 0;
  return { name, limit: lim, requested: requested ?? 0, within: (requested ?? 0) <= lim };
}

/**
 * The single decision point. Given the action an agent wants to take and the
 * customer's config for that agent, decide: act automatically, ask first, or
 * just observe — and explain why in plain English.
 */
export function decidePolicy(action: Action | undefined, config: AgentConfig, intent?: ProposalKind): PolicyDecision {
  const mode = config.mode;

  // Escalating to a human is always allowed — deferring to a person is the safest move.
  if (action?.type === 'escalateToHuman') {
    return { outcome: 'needs-approval', mode, reason: 'This decision is too consequential for me to make — routed to a human RM with full context.' };
  }

  if (!action || action.type === 'none') {
    return { outcome: 'observe-only', mode, reason: 'Informational only — there is nothing to execute.' };
  }

  if (mode === 'observe') {
    // Observe has no threshold to clear: it simply flags and logs whatever it
    // spots, and never acts or interrupts — no limit involved.
    return {
      outcome: 'observe-only',
      mode,
      reason: 'You set this agent to Observe — it flags and logs whatever it spots, but never acts or interrupts.',
    };
  }

  if (mode === 'suggest') {
    const check = checkLimit(action, config.limits);
    // Above the one-tap limit, a Suggest-mode agent doesn't ask you to rubber-stamp
    // a big move — it brings in a human RM with the full pack. (Only genuine
    // act-on-your-behalf intents are limit-gated this way; deliberate multi-option
    // decisions already belong to you and stay a one-tap call.)
    if (intent === 'action-taken' && check && !check.within) {
      // Above your comfort line the agent won't act on its own — but the call is
      // still yours: approve it in one tap, bring in a human RM, or leave it.
      return {
        outcome: 'needs-approval',
        mode,
        aboveComfortLine: true,
        reason: `${money(check.requested)} is above the ${money(check.limit)} comfort line you set, so I haven't acted on my own. It's your call: approve it and I'll do it now, book a human RM, or leave it for now.`,
        limitCheck: check,
      };
    }
    const meter = check
      ? ` At ${money(check.requested)} it's within the ${money(check.limit)} you're happy to wave through in one tap.`
      : '';
    return {
      outcome: 'needs-approval',
      mode,
      reason: `You set this agent to Suggest — everything is prepared, but the decision stays one tap away from you.${meter}`,
      limitCheck: check ?? undefined,
    };
  }

  // mode === 'auto'
  // Some proposals are deliberate multi-option decisions the agent always hands to
  // the customer (e.g. a cashflow shortfall with several remedies). There's no
  // single auto-limit that applies, so don't frame it as a spending-limit breach.
  if (intent === 'needs-approval') {
    return {
      outcome: 'needs-approval',
      mode,
      reason: 'This one has real trade-offs, so rather than pick for you I prepared the options and left the call to you.',
    };
  }

  const check = checkLimit(action, config.limits);
  if (check && !check.within) {
    return {
      outcome: 'needs-approval',
      mode,
      reason: `${money(check.requested)} is above your auto limit of ${money(check.limit)} for ${check.name.toLowerCase()} — so I'm asking first.`,
      limitCheck: check,
    };
  }
  return {
    outcome: 'auto-execute',
    mode,
    reason: check
      ? `${money(check.requested)} is within your ${money(check.limit)} auto limit — I handled it and logged everything.`
      : 'Within your guardrails — I handled it and logged everything.',
    limitCheck: check ?? undefined,
  };
}
