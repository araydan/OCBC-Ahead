import { PERSONAS } from '@shared/personas';
import { useSimulation } from '@/store/useSimulation';
import { checkServer } from '@/store/reasoningClient';
import { fmtDateTime } from '@/lib/format';

export function DemoPanel() {
  const personaId = useSimulation((s) => s.personaId);
  const loadPersona = useSimulation((s) => s.loadPersona);
  const state = useSimulation((s) => s.state);
  const advance = useSimulation((s) => s.advanceClock);
  const nextEvent = useSimulation((s) => s.nextEvent());
  const fireScenario = useSimulation((s) => s.fireScenario);
  const hasFired = useSimulation((s) => s.hasFiredScenario);
  const reset = useSimulation((s) => s.resetDemo);
  const reasoningMode = useSimulation((s) => s.reasoningMode);
  const setReasoningMode = useSimulation((s) => s.setReasoningMode);
  const serverAvailable = useSimulation((s) => s.serverAvailable);
  const setServerAvailable = useSimulation((s) => s.setServerAvailable);
  const rmMode = useSimulation((s) => s.rmMode);
  const setRmMode = useSimulation((s) => s.setRmMode);

  const events = PERSONAS[personaId].events;

  const pickLLM = async () => {
    const ok = await checkServer();
    setServerAvailable(ok);
    setReasoningMode('llm');
  };

  return (
    <aside className="w-full max-w-[340px] space-y-3 rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-ocbc-ink text-white">🎬</span>
        <div>
          <div className="text-sm font-extrabold text-ocbc-ink">Presenter Controls</div>
          <div className="text-[11px] text-ocbc-slate">Drive the live demo — repeatable, never flaky</div>
        </div>
      </div>

      {/* Persona */}
      <div>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ocbc-slate">Persona</div>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.values(PERSONAS).map((p) => (
            <button
              key={p.id}
              onClick={() => loadPersona(p.id)}
              className={`rounded-xl border px-3 py-2 text-left ${personaId === p.id ? 'border-ocbc-red bg-ocbc-red/5' : 'border-ocbc-line bg-white'}`}
            >
              <div className="text-lg">{p.avatar}</div>
              <div className="text-[12px] font-bold text-ocbc-ink">{p.name.split(' ')[0]}</div>
              <div className="text-[10px] text-ocbc-slate">{p.tagline.split(' · ')[1]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Time engine */}
      <div className="rounded-xl bg-ocbc-mist p-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-ocbc-slate">Simulated clock</div>
        <div className="text-[12.5px] font-bold text-ocbc-ink">{fmtDateTime(state.asOf)}</div>
        <button onClick={advance} disabled={!nextEvent} className="btn-primary mt-2 w-full py-2.5 text-sm disabled:opacity-40">
          {nextEvent ? `▶ Advance → ${nextEvent.label}` : '✓ Demo complete'}
        </button>
        {nextEvent && <p className="mt-1.5 text-[11px] leading-snug text-ocbc-slate">{nextEvent.note}</p>}
      </div>

      {/* Jump to any scenario */}
      <div>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ocbc-slate">Trigger a scenario</div>
        <div className="space-y-1.5">
          {events.map((e) => {
            const fired = hasFired(e.scenario);
            return (
              <button
                key={e.id}
                onClick={() => fireScenario(e.scenario)}
                disabled={fired}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left ${fired ? 'border-ocbc-line bg-ocbc-mist opacity-60' : 'border-ocbc-line bg-white hover:border-ocbc-red'}`}
              >
                <span className="text-[12px] font-bold text-ocbc-ink">{e.label}</span>
                <span className="ml-auto text-[11px] font-semibold text-ocbc-slate">{fired ? '✓ done' : 'fire ▶'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reasoning source */}
      <div>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ocbc-slate">“Ask why” engine</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => setReasoningMode('scripted')} className={`rounded-xl border px-3 py-2 text-[12px] font-bold ${reasoningMode === 'scripted' ? 'border-ocbc-red bg-ocbc-red/5 text-ocbc-ink' : 'border-ocbc-line text-ocbc-slate'}`}>
            ● Offline (scripted)
          </button>
          <button onClick={pickLLM} className={`rounded-xl border px-3 py-2 text-[12px] font-bold ${reasoningMode === 'llm' ? 'border-ocbc-red bg-ocbc-red/5 text-ocbc-ink' : 'border-ocbc-line text-ocbc-slate'}`}>
            ✦ Live (LLM)
          </button>
        </div>
        {reasoningMode === 'llm' && (
          <p className={`mt-1.5 text-[11px] font-semibold ${serverAvailable ? 'text-ocbc-green' : 'text-ocbc-amber'}`}>
            {serverAvailable ? '✓ Backend connected — answers are AI-generated' : '⚠ Backend not detected — safe scripted fallback in use'}
          </p>
        )}
      </div>

      {/* Toggles */}
      <div className="flex gap-1.5">
        <button onClick={() => setRmMode(!rmMode)} className={`flex-1 rounded-xl border px-3 py-2 text-[12px] font-bold ${rmMode ? 'border-ocbc-red bg-ocbc-red/5 text-ocbc-ink' : 'border-ocbc-line text-ocbc-slate'}`}>
          {rmMode ? '◀ Customer view' : '🧑‍💼 View as RM'}
        </button>
        <button onClick={reset} className="flex-1 rounded-xl border border-ocbc-line px-3 py-2 text-[12px] font-bold text-ocbc-slate hover:bg-ocbc-mist">
          ↻ Reset demo
        </button>
      </div>
    </aside>
  );
}
