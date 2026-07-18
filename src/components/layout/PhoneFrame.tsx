import { useEffect, useRef } from 'react';
import { useSimulation } from '@/store/useSimulation';
import { useUI, guideSeen } from '@/store/useUI';
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
import { GuideOverlay } from '@/components/guide/GuideOverlay';

export function PhoneFrame() {
  const tab = useSimulation((s) => s.activeTab);
  const rmMode = useSimulation((s) => s.rmMode);
  const guideStep = useUI((s) => s.guideStep);
  const startGuide = useUI((s) => s.startGuide);
  const endGuide = useUI((s) => s.endGuide);
  const frameRef = useRef<HTMLDivElement>(null);

  // First visit only: open the tour at the welcome card.
  useEffect(() => {
    if (!guideSeen()) startGuide(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The customer app disappears in RM mode — close the tour without marking it seen.
  useEffect(() => {
    if (rmMode && guideStep !== null) endGuide(false);
  }, [rmMode, guideStep, endGuide]);

  return (
    <div className="relative w-full max-w-[400px]">
      <div
        ref={frameRef}
        className="relative h-[820px] max-h-[86vh] overflow-hidden rounded-[2.4rem] border-[10px] border-black bg-[#eef0f5] shadow-lift"
      >
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
        {!rmMode && <GuideOverlay container={frameRef} />}
      </div>
    </div>
  );
}
