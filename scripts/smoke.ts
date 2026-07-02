// Headless run of the full demo timeline in pure Node — proves the agent engine
// is environment-agnostic (the same code runs in the browser and on the server)
// and acts as a quick regression check. Run with: npm run smoke
import { PERSONAS, DEFAULT_PERSONA_ID } from '../shared/personas';
import { DEFAULT_CONFIGS, dispatch } from '../shared/agents';
import { money } from '../shared/util';
import type { FinancialState } from '../shared/types';

const persona = PERSONAS[DEFAULT_PERSONA_ID];
let state: FinancialState = persona.initialState;
const configs = structuredClone(DEFAULT_CONFIGS);

console.log(`\n🧠 OCBC Ahead — engine smoke test for ${persona.name}\n`);

let totalProposals = 0;
let totalAudit = 0;

for (const event of persona.events) {
  const res = dispatch(event, state, configs);
  state = res.state;
  totalProposals += res.proposals.length;
  totalAudit += res.audit.length;

  console.log(`── ${event.label}  (${event.at})`);
  for (const p of res.proposals) {
    const c = Math.round(p.confidence * 100);
    console.log(`   ${p.kind.padEnd(16)} | ${p.agentId.padEnd(10)} | ${c}% | ${p.policy.outcome}`);
    console.log(`      "${p.title}"`);
  }
  if (res.audit.length) {
    for (const a of res.audit) console.log(`      ↳ audit: ${a.detail}`);
  }
  console.log('');
}

console.log('── Final balances');
for (const a of state.accounts) console.log(`   ${a.name.padEnd(24)} ${money(a.balance, a.currency)}`);
console.log('\n── Goals');
for (const g of state.goals) console.log(`   ${g.emoji} ${g.name.padEnd(20)} ${money(g.saved)} / ${money(g.target)}`);

console.log(`\n✅ Dispatched ${persona.events.length} events → ${totalProposals} proposals, ${totalAudit} audit entries. No errors.\n`);
