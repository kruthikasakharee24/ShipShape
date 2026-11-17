import { useState } from 'react';
import { Loader2, MessageSquare, Send, X } from 'lucide-react';
import type { AgentChatMessage, ReleaseCandidate } from '../types/release';

interface ChatAssistantDrawerProps {
  isOpen: boolean;
  release: ReleaseCandidate;
  messages: AgentChatMessage[];
  isAsking: boolean;
  askError: string | null;
  onClose: () => void;
  onAsk: (question: string) => void;
}

export function ChatAssistantDrawer({
  isOpen,
  release,
  messages,
  isAsking,
  askError,
  onClose,
  onAsk,
}: ChatAssistantDrawerProps) {
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isAsking) return;
    onAsk(input.trim());
    setInput('');
  }

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl"
      role="dialog"
      aria-label="ShipShape AI Assistant"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-700" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">ShipShape AI Assistant</h2>
            <p className="font-mono text-[11px] text-slate-500">
              Context: {release.version} · {release.tests.length} tests · {release.bugs.length} bugs ·{' '}
              {release.securityReports.length} sec
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close assistant"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Ask anything about <strong>{release.version}</strong>—blockers, responsible source
              documents, security scan findings, policy compliance, or what-if deployment
              scenarios.
            </p>
            <div className="space-y-2 pt-1">
              {[
                'Why is this release blocked or inconclusive?',
                'Which uploaded document has the highest-severity issues?',
                'What is the fastest path to reach GO status?',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onAsk(prompt)}
                  disabled={isAsking}
                  className="block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-md px-3.5 py-2.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'ml-6 border border-slate-200 bg-slate-100 text-slate-900'
                  : 'mr-2 border border-slate-200 bg-white text-slate-700'
              }`}
            >
              <div className="mb-1 font-mono text-[10px] font-semibold text-slate-500">
                {m.role === 'user' ? 'YOU' : 'SHIPSHAPE AGENT'} · {m.timestamp}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))
        )}
        {askError && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {askError}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about findings, CVEs, policies, or documents..."
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isAsking}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
        >
          {isAsking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Send
        </button>
      </form>
    </div>
  );
}
