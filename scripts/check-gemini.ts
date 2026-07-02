// One-off: verify the Gemini "Ask" backend actually generates (not just that a
// key is present). Builds a real proposal from the demo engine and runs the SAME
// askGemini() the Cloud Function uses. Run with: npx tsx scripts/check-gemini.ts
import 'dotenv/config';
import { PERSONAS, DEFAULT_PERSONA_ID } from '../shared/personas';
import { DEFAULT_CONFIGS, dispatch } from '../shared/agents';
import { askGemini, hasGeminiKey, GEMINI_MODEL } from '../server/gemini';
import type { AgentProposal, FinancialState } from '../shared/types';

async function main() {
  if (!hasGeminiKey()) {
    console.log('❌ GEMINI_API_KEY not found in env (.env).');
    process.exit(1);
  }

  const persona = PERSONAS[DEFAULT_PERSONA_ID];
  let state: FinancialState = structuredClone(persona.initialState);
  const configs = structuredClone(DEFAULT_CONFIGS);

  let proposal: AgentProposal | undefined;
  for (const event of persona.events) {
    const res = dispatch(event, state, configs);
    state = res.state;
    if (!proposal && res.proposals.length) proposal = res.proposals[0];
  }
  if (!proposal) {
    console.log('❌ No proposal generated to test with.');
    process.exit(1);
  }

  const question = 'Why did you make this move, and what happens if I undo it?';
  console.log(`Model:    ${GEMINI_MODEL}`);
  console.log(`Proposal: "${proposal.title}"`);
  console.log(`Question: ${question}\n`);

  const t0 = Date.now();
  try {
    const answer = await askGemini(proposal, state, question);
    const ms = Date.now() - t0;
    if (answer) {
      console.log(`✅ Gemini responded in ${ms}ms (${answer.length} chars):\n`);
      console.log(answer);
    } else {
      console.log(`⚠️  Gemini returned an EMPTY answer (${ms}ms).`);
      process.exit(2);
    }
  } catch (e: any) {
    console.log(`❌ Gemini call FAILED: ${e?.message ?? e}`);
    process.exit(1);
  }
}

main();
