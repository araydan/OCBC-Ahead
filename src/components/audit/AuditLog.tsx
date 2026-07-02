import { AGENT_META } from '@shared/agents';
import { useSimulation } from '@/store/useSimulation';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { Icon } from '@/components/ui/Icon';
import { fmtDateTime } from '@/lib/format';

export function AuditLog() {
  const audit = useSimulation((s) => s.audit);
  const revert = useSimulation((s) => s.revertAudit);

  return (
    <div className="space-y-3 px-4 pb-28 pt-3">
      <div className="rounded-2xl bg-ocbc-ink p-4 text-white">
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
          <Icon name="receipt" size={18} strokeWidth={2} /> Decision Log
        </h2>
        <p className="mt-1 text-[12.5px] text-white/80">
          A plain-English record of every action an agent took — who, what, why, and when. Anything reversible can be undone right here.
        </p>
      </div>

      {audit.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ocbc-line bg-white p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ocbc-mist text-ocbc-red">
            <Icon name="receipt" size={24} />
          </div>
          <p className="mt-2 text-sm font-semibold text-ocbc-ink">No actions yet</p>
          <p className="mt-1 text-[12.5px] text-ocbc-slate">When your agents act, every step is logged here.</p>
        </div>
      )}

      {audit.map((a) => (
        <div key={a.id} className={`card p-3.5 ${a.reverted ? 'opacity-60' : ''}`}>
          <div className="flex items-start gap-3">
            <AgentAvatar id={a.agentId} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-ocbc-ink">{AGENT_META[a.agentId].name}</span>
                <span className="shrink-0 text-[11px] text-ocbc-slate">{fmtDateTime(a.at)}</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ocbc-ink">{a.detail}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="pill bg-ocbc-mist text-ocbc-slate">{Math.round(a.confidence * 100)}% confidence</span>
                {a.reverted && <span className="pill bg-ocbc-mist text-ocbc-slate">↩ reversed</span>}
                {a.reversible && !a.reverted && (
                  <button onClick={() => revert(a.id)} className="ml-auto rounded-full border border-ocbc-line px-3 py-1 text-[12px] font-bold text-ocbc-red hover:bg-ocbc-mist">
                    Undo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
