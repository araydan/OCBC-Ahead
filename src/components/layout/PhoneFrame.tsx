import { useSimulation } from '@/store/useSimulation';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { HomeFeed } from '@/components/feed/HomeFeed';
import { ControlCenter } from '@/components/control/ControlCenter';
import { ActivityView } from '@/components/activity/ActivityView';
import { AuditLog } from '@/components/audit/AuditLog';
import { RMConsole } from '@/components/rm/RMConsole';
import { AskSheet } from '@/components/ask/AskSheet';
import { WhileYouWereAwayDetail } from '@/components/feed/WhileYouWereAwayDetail';
import { Toaster } from '@/components/ui/Toaster';

export function PhoneFrame() {
  const tab = useSimulation((s) => s.activeTab);
  const rmMode = useSimulation((s) => s.rmMode);

  return (
    <div className="relative w-full max-w-[400px]">
      <div className="relative h-[820px] max-h-[86vh] overflow-hidden rounded-[2.4rem] border-[10px] border-black bg-[#eef0f5] shadow-lift">
        <div className="absolute left-1/2 top-0 z-30 h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-black" />

        {rmMode ? (
          <RMConsole />
        ) : (
          <div className="flex h-full flex-col">
            <TopBar />
            <div data-guide-scroller className="no-scrollbar flex-1 overflow-y-auto">
              {tab === 'home' && <HomeFeed />}
              {tab === 'control' && <ControlCenter />}
              {tab === 'activity' && <ActivityView />}
              {tab === 'log' && <AuditLog />}
            </div>
            <BottomNav />
          </div>
        )}

        <Toaster />
        <WhileYouWereAwayDetail />
        <AskSheet />
      </div>
    </div>
  );
}
