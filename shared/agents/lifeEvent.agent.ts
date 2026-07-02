import type { Agent } from './base';

/**
 * Life-Event Agent — embodies the "living, continuous profile" pillar.
 * It observes (never acts) and keeps the customer's picture current so every
 * other agent reasons on today's reality, not the sign-up snapshot.
 */
export const lifeEventAgent: Agent = {
  meta: { id: 'lifeEvent', name: 'Life-Event Agent', blurb: 'Keeps your profile current', emoji: '🌱', accent: '#1FB6A6' },
  defaultConfig: { id: 'lifeEvent', mode: 'observe', limits: {} },

  evaluate(event) {
    if (event.type !== 'salary') return null;
    return {
      agentId: 'lifeEvent',
      scenario: 'salary-allocation',
      kind: 'insight',
      title: 'Your financial profile just shifted',
      summary:
        "Your salary is up 12% over 6 months and you're tracking ahead on your BTO goal. I've refreshed your plan — the other agents now use this newer picture, not your sign-up snapshot.",
      reasoning: [
        { label: 'Continuous profile', detail: 'I re-read your last 6 months, not just your onboarding form.' },
        { label: 'What changed', detail: 'Income +12%, surplus stable, BTO goal ahead of schedule.' },
        { label: 'Knock-on effect', detail: 'Yield and Debt agents will use the higher surplus in their next checks.' },
      ],
      confidence: 0.84,
      dataUsed: ['6-month income trend', 'Goal trajectories', 'Spending stability'],
      projectedOutcome: [
        { label: 'Income trend', value: '+12% / 6 mo', tone: 'good' },
        { label: 'BTO goal', value: 'ahead of schedule', tone: 'good' },
      ],
      priority: 0,
    };
  },
};
