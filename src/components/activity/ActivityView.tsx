import { useSimulation } from '@/store/useSimulation';
import { Icon } from '@/components/ui/Icon';
import { money, fmtDate, daysBetween } from '@/lib/format';

// How far ahead the upcoming-payments view looks. Three weeks covers the demo's
// salary + bill cycle without turning the list into a wall.
const LOOKAHEAD_DAYS = 21;

// The deliberately SECONDARY screen — the "old way" of banking (balances + tiles).
// It exists, but it's a tab you have to choose, not the home screen. That's the
// whole point: OCBC Ahead leads with what the agents did, not with raw data.
// What we add on top of the old way: the forward view (net position + what's
// about to hit), because that's the picture the Cashflow Agent reasons over.
export function ActivityView() {
  const state = useSimulation((s) => s.state);
  const setTab = useSimulation((s) => s.setTab);

  const sgd = state.accounts.filter((a) => a.currency === 'SGD');
  const foreign = state.accounts.filter((a) => a.currency !== 'SGD');
  const cash = sgd.filter((a) => a.balance > 0).reduce((n, a) => n + a.balance, 0);
  const owed = sgd.filter((a) => a.balance < 0).reduce((n, a) => n + a.balance, 0);
  const net = cash + owed;

  const assets = state.accounts.filter((a) => a.type !== 'home-loan');
  const liabilities = state.accounts.filter((a) => a.type === 'home-loan');

  const upcoming = state.scheduled
    .filter((s) => {
      const d = daysBetween(state.asOf, s.date);
      return d >= 0 && d <= LOOKAHEAD_DAYS;
    })
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const everyday = state.accounts.find((a) => a.type === 'current');
  const projected = everyday ? everyday.balance + upcoming.reduce((n, s) => n + s.amount, 0) : null;

  return (
    <div className="space-y-3 px-4 pb-28 pt-3">
      <button onClick={() => setTab('home')} className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-ocbc-line bg-white px-4 py-2.5 text-left">
        <span className="text-lg">↩</span>
        <span className="text-[12.5px] text-ocbc-slate">This is the old way — raw balances. <span className="font-bold text-ocbc-red">Tap to see what your agents are doing instead.</span></span>
      </button>

      {/* Where you stand — lead with what you HAVE (like a bank statement does);
          the loan-dominated net figure is context, not the headline. */}
      <div data-guide="money-hub" className="rounded-2xl bg-ocbc-ink p-4 text-white">
        <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-white/60">
          <Icon name="wallet" size={15} strokeWidth={2} /> Cash & savings · SGD
        </h2>
        <div className="tnum mt-1.5 text-[28px] font-black leading-none text-ocbc-glow">{money(cash)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.08] px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/55">Cards & loans</div>
            <div className="tnum text-[15px] font-extrabold text-white/90">{money(owed)}</div>
          </div>
          <div className="rounded-xl bg-white/[0.08] px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/55">Net position</div>
            <div className="tnum text-[15px] font-extrabold text-white/90">{money(net)}</div>
          </div>
        </div>
        {foreign.length > 0 && (
          <p className="mt-2 text-[11px] font-medium text-white/55">
            Plus {foreign.map((a) => money(a.balance, a.currency)).join(' · ')} held in foreign currency
          </p>
        )}
      </div>

      {/* Upcoming — what the Cashflow Agent sees before it hits your account */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-ocbc-slate">
            <Icon name="calendar" size={14} strokeWidth={2} /> Next {LOOKAHEAD_DAYS} days
          </h3>
          <span className="text-[11px] font-semibold text-ocbc-slate">{upcoming.length} scheduled</span>
        </div>

        {upcoming.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-ocbc-slate">Nothing scheduled in the next {LOOKAHEAD_DAYS} days.</p>
        ) : (
          <>
            <div className="mt-2 divide-y divide-ocbc-line">
              {upcoming.map((s) => {
                const inflow = s.amount > 0;
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ocbc-mist text-center leading-none">
                      <div>
                        <div className="text-[13px] font-extrabold text-ocbc-ink">{new Date(s.date).getDate()}</div>
                        <div className="text-[8.5px] font-bold uppercase text-ocbc-slate">
                          {new Date(s.date).toLocaleDateString('en-SG', { month: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-ocbc-ink">{s.label}</div>
                      <div className="text-[11px] capitalize text-ocbc-slate">{s.category}</div>
                    </div>
                    <div className={`tnum text-[13.5px] font-extrabold ${inflow ? 'text-ocbc-green' : 'text-ocbc-ink'}`}>
                      {inflow ? '+' : ''}{money(s.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
            {projected != null && everyday && (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-ocbc-mist px-3 py-2.5">
                <span className="text-[12px] font-semibold text-ocbc-slate">{everyday.name} after these</span>
                <span className={`tnum text-[14px] font-extrabold ${projected < 0 ? 'text-ocbc-red' : 'text-ocbc-ink'}`}>
                  {money(projected)}
                </span>
              </div>
            )}
          </>
        )}
      </section>

      <section className="card p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-ocbc-slate">Accounts</h3>
        <div className="mt-2 divide-y divide-ocbc-line">
          {assets.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-[13.5px] font-bold text-ocbc-ink">{a.name}</div>
                <div className="text-[11px] text-ocbc-slate">{a.mask}{a.apy ? ` · ${(a.apy * 100).toFixed(2)}% p.a.` : ''}{a.moneyLock ? ' · 🔒 Money Lock' : ''}</div>
              </div>
              <div className="tnum text-[14px] font-extrabold text-ocbc-ink">{money(a.balance, a.currency)}</div>
            </div>
          ))}
        </div>
      </section>

      {liabilities.length > 0 && (
        <section className="card p-4">
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-ocbc-slate">Loans</h3>
          <div className="mt-2 divide-y divide-ocbc-line">
            {liabilities.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-[13.5px] font-bold text-ocbc-ink">{a.name}</div>
                  <div className="text-[11px] text-ocbc-slate">{a.mask} · {(a.apy! * 100).toFixed(2)}% p.a.</div>
                </div>
                <div className="tnum text-[14px] font-extrabold text-ocbc-red">{money(a.balance, a.currency)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-ocbc-slate">Goals</h3>
        <div className="mt-3 space-y-3">
          {state.goals.map((g) => {
            const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
            return (
              <div key={g.id}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-bold text-ocbc-ink">{g.emoji} {g.name}</span>
                  <span className="tnum text-ocbc-slate">{money(g.saved)} / {money(g.target)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ocbc-mist">
                  <div className="h-full rounded-full bg-ocbc-green" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-ocbc-slate">Recent activity</h3>
        <div className="mt-2 divide-y divide-ocbc-line">
          {state.transactions.slice(0, 8).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-[13px] font-semibold text-ocbc-ink">{t.merchant}</div>
                <div className="text-[11px] text-ocbc-slate">{fmtDate(t.date)} · {t.category}</div>
              </div>
              <div className={`tnum text-[13.5px] font-bold ${t.amount < 0 ? 'text-ocbc-ink' : 'text-ocbc-green'}`}>
                {t.amount < 0 ? '' : '+'}{money(t.amount, t.accountId === 'acc_gca' ? 'USD' : 'SGD')}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
