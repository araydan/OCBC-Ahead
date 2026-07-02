import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { AgentProposal } from '@shared/types';
import { AGENT_META } from '@shared/agents';
import { useUI } from '@/store/useUI';
import { useSimulation } from '@/store/useSimulation';
import { askReasoning, suggestedQuestions } from '@/store/reasoningClient';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { Icon } from '@/components/ui/Icon';
import { useEscape } from '@/lib/useEscape';

interface Msg { role: 'user' | 'agent'; text: string; source?: 'llm' | 'scripted'; model?: string }

/** The agent-is-typing bubble — three soft dots instead of a bare "thinking…". */
function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl bg-ocbc-mist px-3.5 py-3" aria-label="Agent is thinking">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-ocbc-slate/70"
            animate={{ opacity: [0.35, 1, 0.35], y: [0, -2.5, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
}

function AskBody({ proposal }: { proposal: AgentProposal }) {
  const close = useUI((s) => s.closeAsk);
  const state = useSimulation((s) => s.state);
  const mode = useSimulation((s) => s.reasoningMode);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();

  useEscape(close);

  // A chat that doesn't follow its own conversation is broken — keep the newest
  // message (or the typing indicator) in view.
  useEffect(() => {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [msgs, busy, reducedMotion]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    const res = await askReasoning(mode, proposal, state, q);
    setMsgs((m) => [...m, { role: 'agent', text: res.answer, source: res.source, model: res.model }]);
    setBusy(false);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Ask ${AGENT_META[proposal.agentId].name} about ${proposal.title}`}
      className="absolute inset-x-0 bottom-0 z-50 flex max-h-[88%] flex-col rounded-t-3xl bg-white shadow-lift"
    >
      <div className="flex items-center gap-3 border-b border-ocbc-line p-4">
        <AgentAvatar id={proposal.agentId} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ocbc-ink">Ask {AGENT_META[proposal.agentId].name}</div>
          <div className="truncate text-[11px] text-ocbc-slate">about “{proposal.title}”</div>
        </div>
        <button
          onClick={close}
          aria-label="Close"
          className="grid h-8 w-8 place-items-center rounded-full bg-ocbc-mist text-ocbc-slate transition hover:bg-ocbc-line"
        >
          <Icon name="close" size={16} strokeWidth={2.2} />
        </button>
      </div>

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="rounded-2xl bg-ocbc-mist p-3 text-[12.5px] text-ocbc-slate">
            Ask me anything about this decision — in plain English. Try one of these:
          </div>
        )}
        {msgs.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === 'user' ? 'bg-ocbc-red text-white' : 'bg-ocbc-mist text-ocbc-ink'
              }`}
            >
              {m.text}
              {m.role === 'agent' && (
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-ocbc-slate">
                  {m.source === 'llm' ? `✦ Live · ${m.model ?? 'AI'}` : '• explained from the decision record'}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {busy && <TypingDots />}
      </div>

      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {suggestedQuestions(proposal).map((q) => (
            <button key={q} onClick={() => ask(q)} className="rounded-full border border-ocbc-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ocbc-ink hover:bg-ocbc-mist">
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="flex items-center gap-2 border-t border-ocbc-line p-3"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask why, or what-if…"
          aria-label="Your question"
          className="flex-1 rounded-full bg-ocbc-mist px-4 py-2.5 text-[13px] outline-none placeholder:text-ocbc-slate"
        />
        <button type="submit" disabled={busy || !input.trim()} className="btn-primary px-4 py-2.5 text-sm">Ask</button>
      </form>
    </motion.div>
  );
}

export function AskSheet() {
  const askId = useUI((s) => s.askProposalId);
  const close = useUI((s) => s.closeAsk);
  const proposal = useSimulation((s) => s.proposals.find((p) => p.id === askId));

  return (
    <AnimatePresence>
      {askId && proposal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 z-40 bg-black/30"
          />
          <AskBody key={askId} proposal={proposal} />
        </>
      )}
    </AnimatePresence>
  );
}
