import type { AgentId, AutonomyMode } from '@shared/types';
import { AGENT_ORDER, AGENT_META } from '@shared/agents';
import { useSimulation } from '@/store/useSimulation';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { Icon, MODE_ICON } from '@/components/ui/Icon';
import { money, tint } from '@/lib/format';

const MODES: { id: AutonomyMode; label: string }[] = [
  { id: 'observe', label: 'Observe' },
  { id: 'suggest', label: 'Suggest' },
  { id: 'auto', label: 'Auto' },
];

// How each mode "feels" at a glance — the glowing dot colour + one-word status.
const MODE_STATUS: Record<AutonomyMode, { dot: string; label: string }> = {
  observe: { dot: '#94A3B8', label: 'Watching' },
  suggest: { dot: '#2F6BFF', label: 'Asks first' },
  auto: { dot: '#1F9D6B', label: 'Acting' },
};

const LIMITS: Partial<Record<AgentId, { key: 'maxAutoMoveSGD' | 'maxAutoAllocateSGD' | 'maxAutoFxSGD'; min: number; max: number; step: number; caption: string; noun: string }>> = {
  yield: { key: 'maxAutoMoveSGD', min: 0, max: 50000, step: 1000, caption: 'Idle-cash move limit', noun: 'move' },
  cashflow: { key: 'maxAutoAllocateSGD', min: 0, max: 5000, step: 250, caption: 'Salary allocation limit', noun: 'allocation' },
  fxTravel: { key: 'maxAutoFxSGD', min: 0, max: 5000, step: 250, caption: 'FX lock limit', noun: 'FX lock' },
};

// The dollar line matters in Suggest and Auto. Observe has no threshold — it flags
// and logs whatever it spots — so it shows no slider at all (handled below).
function meterCopy(mode: AutonomyMode, amount: string, noun: string): string {
  if (mode === 'suggest')
    return `Asks first — a ${noun} up to ${amount} is a one-tap yes; anything bigger and the call's yours: approve it, book a human RM, or leave it.`;
  return `Acts on its own for any ${noun} up to ${amount}, then tells you.`;
}

/** Quick risk-appetite presets snapped to the slider's own min/max/step. */
function presetsFor(limit: { min: number; max: number; step: number }) {
  const span = limit.max - limit.min;
  const snap = (frac: number) => Math.round((limit.min + span * frac) / limit.step) * limit.step;
  return [
    { label: 'Conservative', value: snap(0.25) },
    { label: 'Balanced', value: snap(0.5) },
    { label: 'Aggressive', value: snap(0.85) },
  ];
}

export function ControlCenter() {
  const configs = useSimulation((s) => s.configs);
  const setMode = useSimulation((s) => s.setMode);
  const setLimit = useSimulation((s) => s.setLimit);

  return (
    <div className="space-y-3 px-4 pb-28 pt-3">
      <div data-guide="control-hub" className="rounded-2xl bg-ocbc-ink p-4 text-white">
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
          <Icon name="sliders" size={18} strokeWidth={2} /> You're in control
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/80">
          Set how far each agent can go on its own — from just watching, to asking first, to acting within limits you set.
          Every autonomous action stays logged and reversible.
        </p>
      </div>

      {AGENT_ORDER.map((id) => {
        const meta = AGENT_META[id];
        const cfg = configs[id];
        const limit = LIMITS[id];
        const isProtection = id === 'protection';
        const status = MODE_STATUS[cfg.mode];
        const current = limit ? cfg.limits[limit.key] ?? 0 : 0;

        return (
          <div key={id} className="card p-4">
            <div className="flex items-center gap-3">
              <AgentAvatar id={id} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-ocbc-ink">{meta.name}</div>
                <div className="truncate text-[12px] text-ocbc-slate">{meta.blurb}</div>
              </div>
              {/* Refinement: glowing status indicator — shows how the agent is behaving right now. */}
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ocbc-mist px-2.5 py-1 text-[11px] font-bold text-ocbc-ink">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inset-0 rounded-full animate-pulse-ring" style={{ background: status.dot }} />
                  <span className="relative inline-block h-2.5 w-2.5 rounded-full" style={{ background: status.dot }} />
                </span>
                {status.label}
              </span>
            </div>

            {/* Autonomy dial — the active mode carries clear extra weight. */}
            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-ocbc-mist p-1">
              {MODES.map((m) => {
                const active = cfg.mode === m.id;
                const disabled = isProtection && m.id === 'observe';
                return (
                  <button
                    key={m.id}
                    disabled={disabled}
                    onClick={() => setMode(id, m.id)}
                    aria-pressed={active}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold transition ${
                      disabled ? 'cursor-not-allowed opacity-30' : active ? 'scale-[1.02]' : 'text-ocbc-slate hover:bg-white'
                    }`}
                    style={active ? { background: meta.accent, color: 'white', boxShadow: '0 6px 14px rgba(0,0,0,0.16)' } : undefined}
                  >
                    <Icon name={MODE_ICON[m.id]} size={15} strokeWidth={2} />
                    {m.label}
                  </button>
                );
              })}
            </div>
            {isProtection && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-ocbc-red">
                <Icon name="shield" size={13} strokeWidth={2} /> Always at least “Suggest” — safety can't be switched off.
              </p>
            )}

            {/* Observe just flags & logs whatever it spots — no dollar line, so no slider. */}
            {limit && cfg.mode === 'observe' && (
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ocbc-slate">
                <Icon name="eye" size={13} strokeWidth={2} className="mt-0.5 shrink-0" />
                Just watching — it flags and logs whatever it spots, with no threshold to clear. It never acts or asks.
              </p>
            )}

            {/* Limit slider — only when the mode actually uses a dollar line (Suggest / Auto). */}
            {limit && cfg.mode !== 'observe' && (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-ocbc-slate">{limit.caption}</span>
                  <span className="tnum text-sm font-extrabold text-ocbc-ink">{money(current)}</span>
                </div>
                <input
                  type="range"
                  aria-label={limit.caption}
                  min={limit.min}
                  max={limit.max}
                  step={limit.step}
                  value={current}
                  onChange={(e) => setLimit(id, limit.key, Number(e.target.value))}
                  className="mt-2 w-full"
                  style={{ accentColor: meta.accent }}
                />

                {/* Refinement: quick risk-appetite presets so judges configure with one tap. */}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-ocbc-slate/70">Risk</span>
                  <div className="grid flex-1 grid-cols-3 gap-1.5">
                    {presetsFor(limit).map((pr) => {
                      const active = current === pr.value;
                      return (
                        <button
                          key={pr.label}
                          onClick={() => setLimit(id, limit.key, pr.value)}
                          aria-pressed={active}
                          className="rounded-full px-2 py-1.5 text-[11px] font-bold transition"
                          style={
                            active
                              ? { background: tint(meta.accent, 0.16), color: meta.accent, boxShadow: `inset 0 0 0 1.5px ${meta.accent}` }
                              : { background: '#F5F5F8', color: '#5B5B6B' }
                          }
                        >
                          {pr.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ocbc-slate">
                  <Icon name={MODE_ICON[cfg.mode]} size={13} strokeWidth={2} className="mt-0.5 shrink-0" style={{ color: meta.accent }} />
                  <span>{meterCopy(cfg.mode, money(current), limit.noun)}</span>
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
