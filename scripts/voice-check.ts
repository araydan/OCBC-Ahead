// Asserts that proposal copy tells the truth about what actually happened:
// Observe/Suggest cards must never claim an action was taken; an auto-executed
// FX lock must not read as an open question. Run with: npm run voice-check
import { PERSONAS, DEFAULT_PERSONA_ID } from '../shared/personas';
import { DEFAULT_CONFIGS, dispatch } from '../shared/agents';
import type { AgentConfig, AgentId, AutonomyMode } from '../shared/types';

// Past-tense claims that are only honest on an executed card.
const ACTED_PHRASES = ['I moved', 'I split', 'I locked', 'I deferred', 'I handled'];

const persona = PERSONAS[DEFAULT_PERSONA_ID];
const events = persona.events.filter((e) =>
  ['salary', 'idle-cash', 'travel-signal'].includes(e.type),
);

function configsInMode(mode: AutonomyMode): Record<AgentId, AgentConfig> {
  const configs = structuredClone(DEFAULT_CONFIGS);
  (Object.keys(configs) as AgentId[]).forEach((id) => {
    // Protection is excluded from the sweep (always at least Suggest by design).
    if (id !== 'protection') configs[id].mode = mode;
  });
  return configs;
}

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.error(`  ✗ ${msg}`);
};

for (const mode of ['observe', 'suggest'] as AutonomyMode[]) {
  console.log(`\n— ${mode.toUpperCase()} mode: no card may claim an action was taken`);
  const configs = configsInMode(mode);
  for (const event of events) {
    const res = dispatch(event, structuredClone(persona.initialState), configs);
    for (const p of res.proposals) {
      if (p.kind === 'protection-alert' || p.kind === 'human-handoff') continue;
      const text = `${p.title} ${p.summary} ${p.reasoning.map((r) => r.detail).join(' ')} ${p.projectedOutcome.map((o) => o.label).join(' ')}`;
      for (const phrase of ACTED_PHRASES) {
        if (text.includes(phrase)) {
          fail(`[${mode}/${event.type}] "${p.title}" contains "${phrase}" but status is ${p.status}`);
        }
      }
      if (mode === 'observe' && p.status !== 'noted') {
        fail(`[observe/${event.type}] "${p.title}" has status ${p.status}, expected noted`);
      }
    }
  }
}

console.log(`\n— AUTO mode: the executed FX card must not read as an open question`);
{
  const configs = configsInMode('auto');
  configs.fxTravel.limits.maxAutoFxSGD = 100000; // ensure within-limit execution
  const travel = events.find((e) => e.type === 'travel-signal');
  if (!travel) {
    fail('no travel-signal event in default persona');
  } else {
    const res = dispatch(travel, structuredClone(persona.initialState), configs);
    const fx = res.proposals.find((p) => p.agentId === 'fxTravel');
    if (!fx) fail('fx proposal missing in auto mode');
    else {
      if (fx.status !== 'auto-executed') fail(`fx status ${fx.status}, expected auto-executed`);
      if (fx.title.includes('?')) fail(`auto-executed fx title still asks a question: "${fx.title}"`);
      if (!fx.summary.includes('I locked')) fail(`auto-executed fx summary lacks executed voice: "${fx.summary}"`);
    }
  }
}

console.log(`\n— RESOLUTION copy: every actionable card must answer in words`);
{
  const configs = structuredClone(DEFAULT_CONFIGS);
  const actionable = persona.events.filter((e) =>
    ['salary', 'idle-cash', 'travel-signal', 'bill-forecast', 'outgoing-transfer', 'refinance-signal'].includes(e.type),
  );
  for (const event of actionable) {
    const res = dispatch(event, structuredClone(persona.initialState), configs);
    for (const p of res.proposals) {
      if (!p.choices || p.choices.length === 0) continue;
      for (const c of p.choices) {
        const note = c.resolvedText ?? p.resolutionCopy?.[c.resolvesTo];
        if (!note) fail(`[${event.type}] "${p.title}" choice "${c.id}" has no resolution statement for ${c.resolvesTo}`);
        // Undo on a still-pending card resolves as a dismiss — that path needs words too.
        if (c.resolvesTo === 'reverted' && !p.resolutionCopy?.rejected) {
          fail(`[${event.type}] "${p.title}" has an undo choice but no 'rejected' copy for the pending-dismiss path`);
        }
      }
      const instalment = p.choices.find((c) => c.id === 'instalment');
      if (instalment && !instalment.resolvedText) {
        fail(`[${event.type}] instalment choice must carry resolvedText (shares 'approved' with top-up)`);
      }
    }
  }
}

if (failures > 0) {
  console.error(`\nvoice-check: ${failures} failure(s)\n`);
  process.exit(1);
}
console.log('\nvoice-check: all copy tells the truth ✓\n');
