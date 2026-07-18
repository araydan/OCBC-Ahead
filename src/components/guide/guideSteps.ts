import type { Tab } from '@/store/useSimulation';

export interface GuideStep {
  tab: Tab;
  /** data-guide attribute of the element to spotlight; null = centered card, even dim. */
  target: string | null;
  title: string;
  body: string;
}

// Index 0 is the welcome card (auto-show entry); the restart icon starts at index 1.
export const GUIDE_STEPS: GuideStep[] = [
  {
    tab: 'home',
    target: null,
    title: 'Welcome to OCBC Ahead',
    body:
      'A team of six banking agents watches your money and acts for you — always within limits you set. Take a one-minute tour of how it works.',
  },
  {
    tab: 'home',
    target: 'away',
    title: 'While you were away',
    body:
      'Overnight, your agents kept working. This digest gathers every move they made while you were gone — tap it to review each one and undo anything you don’t like.',
  },
  {
    tab: 'home',
    target: 'team',
    title: 'Meet your agent team',
    body:
      'Six specialists on duty: Yield puts idle cash to work, Cashflow looks ahead so you’re never caught short, FX & Travel handles trips and currencies, Protection guards every dollar leaving your account, Debt & Credit watches loans and rates, and Life-Event keeps your profile current.',
  },
  {
    tab: 'home',
    target: 'feed',
    title: 'Your agent feed',
    body:
      'When an agent needs your call, it posts a card here. Approve or decline in one tap, ask it to explain its reasoning in plain language, or book a human relationship manager for the big decisions.',
  },
  {
    tab: 'home',
    target: 'bell',
    title: 'Never miss a decision',
    body:
      'The bell counts the decisions waiting on you and jumps straight to the first one. If it’s quiet, your agents are on it.',
  },
  {
    tab: 'control',
    target: 'control-hub',
    title: 'You set the autonomy',
    body:
      'Every agent runs at the level of independence you choose here. Protection never drops below Suggest — safety can’t be switched off. Let’s look at the three levels.',
  },
  {
    tab: 'control',
    target: 'mode-observe',
    title: 'Observe — it just watches',
    body:
      'The agent flags and logs whatever it spots, with no threshold to clear. It never acts and never asks.',
  },
  {
    tab: 'control',
    target: 'mode-suggest',
    title: 'Suggest — it asks first',
    body:
      'Within the limit you set, a proposal is a one-tap yes. Anything bigger always comes to you before a cent moves.',
  },
  {
    tab: 'control',
    target: 'mode-auto',
    title: 'Auto — it acts within limits',
    body:
      'The agent moves on its own up to your dollar limit, then tells you afterwards. Every autonomous move is logged and reversible.',
  },
  {
    tab: 'activity',
    target: 'money-hub',
    title: 'Your money, the classic view',
    body:
      'Accounts and balances live here, plus the forward view: the payments about to hit over the next three weeks and where they leave you — the same picture your Cashflow Agent reasons over.',
  },
  {
    tab: 'log',
    target: 'log-hub',
    title: 'Everything on the record',
    body:
      'Every action an agent takes lands here in plain English — who, what, why, and when. Anything reversible can be undone with one tap.',
  },
  {
    tab: 'home',
    target: 'restart',
    title: 'Replay anytime',
    body:
      'That’s the tour. Tap this icon whenever you want a refresher — now go see what your agents have been up to.',
  },
];
