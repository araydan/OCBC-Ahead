import { AGENT_META } from '@shared/agents';
import { PERSONAS } from '@shared/personas';
import { useSimulation } from '@/store/useSimulation';
import { Confidence } from '@/components/ui/Confidence';
import { Icon, AGENT_ICON } from '@/components/ui/Icon';

// The other end of "human handoff" — what the relationship manager sees when an
// agent escalates. Full context + the agent's recommendation, so the human picks
// up an informed conversation instead of starting cold.
export function RMConsole() {
  const proposals = useSimulation((s) => s.proposals);
  const personaId = useSimulation((s) => s.personaId);
  const rmBookings = useSimulation((s) => s.rmBookings);
  const setRmMode = useSimulation((s) => s.setRmMode);
  const persona = PERSONAS[personaId];
  // The RM sees genuine handoffs (e.g. refinance) plus anything the customer chose
  // to book a call about from a Suggest-mode "above your comfort line" decision.
  const cases = proposals.filter((p) => p.kind === 'human-handoff' || rmBookings.includes(p.id));

  return (
    <div className="flex h-full flex-col bg-[#0F1020] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">OCBC Ahead · RM Console</div>
          <div className="text-lg font-extrabold">Relationship Manager</div>
        </div>
        <button onClick={() => setRmMode(false)} className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold">← Customer view</button>
      </div>

      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-5">
        {cases.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
            <div className="text-3xl">📭</div>
            <p className="mt-2 text-sm font-semibold">No escalations yet</p>
            <p className="mt-1 text-[12.5px] text-white/60">When an agent hands off a complex decision, the full case lands here.</p>
          </div>
        )}

        {cases.map((c) => {
          const booked = rmBookings.includes(c.id);
          return (
            <div key={c.id} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg">{persona.avatar}</span>
                  <div>
                    <div className="text-sm font-bold">{persona.name}</div>
                    <div className="text-[11px] text-white/55">{persona.tagline}</div>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${booked ? 'bg-[#8A6FE8] text-white' : 'bg-white/10 text-white/70'}`}>
                  {booked ? 'Call booked' : 'Awaiting contact'}
                </span>
              </div>

              <div className="mt-3 rounded-xl bg-black/30 p-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">
                  <span className="flex items-center gap-1.5">
                    <Icon name={AGENT_ICON[c.agentId]} size={13} strokeWidth={2} /> {AGENT_META[c.agentId].name} recommends
                  </span>
                  <Confidence value={c.confidence} />
                </div>
                <h3 className="mt-1 text-[15px] font-extrabold">{c.title}</h3>
                <p className="mt-1 text-[13px] text-white/80">{c.summary}</p>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {c.projectedOutcome.map((o, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.06] p-2.5">
                    <div className="text-[10px] uppercase tracking-wide text-white/45">{o.label}</div>
                    <div className="text-[13px] font-extrabold">{o.value}</div>
                  </div>
                ))}
              </div>

              <details className="mt-3 text-[12.5px]">
                <summary className="cursor-pointer font-bold text-white/80">Full agent reasoning & data</summary>
                <div className="mt-2 space-y-1.5 text-white/70">
                  {c.reasoning.map((r, i) => (
                    <p key={i}><span className="font-bold text-white">{r.label}.</span> {r.detail}</p>
                  ))}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.dataUsed.map((d, i) => (
                      <span key={i} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{d}</span>
                    ))}
                  </div>
                </div>
              </details>

              <div className="mt-3 flex gap-2">
                <button className="btn flex-1 rounded-full bg-[#8A6FE8] px-4 py-2.5 text-sm font-bold text-white">Accept & prepare offer</button>
                <button className="btn flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold text-white">Add a note</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
