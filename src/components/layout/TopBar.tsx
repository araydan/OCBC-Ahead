import { PERSONAS } from '@shared/personas';
import { useSimulation } from '@/store/useSimulation';
import { useUI } from '@/store/useUI';
import { fmtDateTime } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

export function TopBar() {
  const state = useSimulation((s) => s.state);
  const personaId = useSimulation((s) => s.personaId);
  const proposals = useSimulation((s) => s.proposals);
  const awayIds = useSimulation((s) => s.awayProposalIds);
  const setTab = useSimulation((s) => s.setTab);
  const pushToast = useSimulation((s) => s.pushToast);
  const highlight = useUI((s) => s.highlight);
  const openAwayAll = useUI((s) => s.openAwayAll);
  const startGuide = useUI((s) => s.startGuide);

  const pending = proposals.filter((p) => p.status === 'pending');

  // The bell is "take me to what needs me": jump to the first open decision in
  // the live feed, fall back to the overnight sheet, else reassure and stay put.
  const onBell = () => {
    const live = pending.find((p) => !awayIds.includes(p.id));
    if (live) {
      setTab('home');
      highlight(live.id);
    } else if (pending.length > 0) {
      openAwayAll();
    } else {
      pushToast('Nothing needs you right now — your agents are on it', 'info');
    }
  };
  const persona = PERSONAS[personaId];
  const firstName = persona.name.split(' ')[0];
  const initials = persona.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const hour = new Date(state.asOf).getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const moneyLock = state.accounts.some((a) => a.moneyLock);

  return (
    <div
      className="relative z-20 overflow-hidden px-4 pb-5 pt-9 text-white shadow-header"
      style={{ background: 'linear-gradient(150deg, #E30613 0%, #C20410 52%, #9C0009 100%)' }}
    >
      {/* soft OCBC light-flare in the corner */}
      <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10 blur-xl" />
      <div className="pointer-events-none absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-black/10 blur-xl" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-[15px] font-black ring-1 ring-white/25 backdrop-blur">
            O
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold tracking-tight">
              OCBC <span className="text-ocbc-gold">Ahead</span>
            </div>
            <div className="text-[11px] font-medium text-white/75">Agentic banking</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBell}
            data-guide="bell"
            aria-label={pending.length > 0 ? `${pending.length} decisions waiting — jump to the first` : 'Notifications'}
            className="relative grid h-9 w-9 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15 transition hover:bg-white/20"
          >
            <Icon name="bell" size={18} />
            {pending.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-white px-1 text-[9px] font-black text-ocbc-red">
                {pending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => startGuide(false)}
            data-guide="restart"
            aria-label="Replay the app tour"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15 transition hover:bg-white/20"
          >
            <Icon name="info" size={18} />
          </button>
          <div
            aria-label={persona.name}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-[12px] font-extrabold text-ocbc-red ring-2 ring-white/40"
          >
            {initials}
          </div>
        </div>
      </div>

      <div className="relative mt-3.5">
        <div className="text-[20px] font-extrabold leading-none">
          {greeting}, {firstName}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {moneyLock && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold ring-1 ring-white/20">
              <Icon name="lock" size={12} strokeWidth={2} /> Money Lock on
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/75">
            <Icon name="clock" size={12} strokeWidth={2} /> {fmtDateTime(state.asOf)} · simulated
          </span>
        </div>
      </div>
    </div>
  );
}
