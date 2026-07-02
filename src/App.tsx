import { useEffect } from 'react';
import { useSimulation } from '@/store/useSimulation';
import { useUI } from '@/store/useUI';
import { checkServer } from '@/store/reasoningClient';
import { PhoneFrame } from '@/components/layout/PhoneFrame';
import { DemoPanel } from '@/components/demo/DemoPanel';

export default function App() {
  const init = useSimulation((s) => s.init);
  const setServer = useSimulation((s) => s.setServerAvailable);
  const showDemo = useUI((s) => s.showDemoPanel);
  const toggleDemo = useUI((s) => s.toggleDemoPanel);

  useEffect(() => {
    init();
    checkServer().then(setServer);
  }, [init, setServer]);

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-ocbc-red text-lg font-black text-white">O</div>
          <div>
            <div className="text-[15px] font-extrabold leading-none text-ocbc-ink">OCBC <span className="text-ocbc-red">Ahead</span></div>
            <div className="mt-0.5 text-[11px] text-ocbc-slate">Agentic banking — it acts for you, you stay in control</div>
          </div>
        </div>
        <button onClick={toggleDemo} className="rounded-full border border-ocbc-line bg-white px-3.5 py-2 text-[12px] font-bold text-ocbc-ink hover:bg-ocbc-mist">
          {showDemo ? 'Hide' : 'Show'} demo controls
        </button>
      </header>

      <main className="flex flex-col items-center justify-center gap-6 px-4 pb-10 lg:flex-row lg:items-start">
        <PhoneFrame />
        {showDemo && <DemoPanel />}
      </main>
    </div>
  );
}
