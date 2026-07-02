// Free-tier reasoning via Google Gemini (the "Ask" path).
// Get a free key at https://aistudio.google.com/apikey — no credit card, no cost
// on the free tier. Reuses the SAME grounded prompt as the Claude path, so the
// answer quality and the "no inventing data" guardrail are identical.
import { GoogleGenAI } from '@google/genai';
import type { AgentProposal, FinancialState } from '../shared/types';
import { buildAskPrompt } from '../shared/reasoning/prompts';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export const hasGeminiKey = (): boolean => Boolean(process.env.GEMINI_API_KEY);

let _ai: GoogleGenAI | null = null;
const ai = (): GoogleGenAI => (_ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

export async function askGemini(proposal: AgentProposal, state: FinancialState, question: string): Promise<string> {
  const { system, user } = buildAskPrompt(proposal, state, question);
  const config: Record<string, any> = {
    systemInstruction: system,
    maxOutputTokens: 1500,
    temperature: 0.4,
  };
  // Gemini 2.5 and 3.x models "think" by default, which can consume the whole
  // output budget and return empty text — disable it for these short, grounded answers.
  if (/2\.5|gemini-3/.test(GEMINI_MODEL)) config.thinkingConfig = { thinkingBudget: 0 };
  const res = await ai().models.generateContent({ model: GEMINI_MODEL, contents: user, config });
  return (res.text ?? '').trim();
}
