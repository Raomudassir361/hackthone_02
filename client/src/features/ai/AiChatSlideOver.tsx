import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AiChatSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

const SUGGESTIONS_BY_ROLE: Record<string, string[]> = {
  admin: [
    'How many employees are currently active?',
    'Who came late most often this month?',
    'What was the total payroll cost last month?',
    'What is our overall attendance rate this month?',
    'Kul kitne employees hain?',
    'Is maheenay kon sabse zyada late aya?',
  ],
  hr: [
    'Who came late most often this month?',
    'What is our attendance rate this month?',
    'How many employees in each department?',
    'Show me leave utilization by type',
    'Aaj kitne log hazir hain?',
    'Kon sabse zyada late aya?',
  ],
  employee: [
    'What is my sick leave balance remaining?',
    'What are the official working hours and grace period?',
    'What was my net salary in my last payslip?',
    'How many casual leaves do I have left?',
    'Meri kitni chuttiyan bachi hain?',
    'Office ke timing kya hain?',
  ],
};

export function AiChatSlideOver({ isOpen, onClose, userRole = 'employee' }: AiChatSlideOverProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your HCM Lite AI Assistant. Ask me anything about company policies, attendance rules, your leave balances, or organizational metrics.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      // Build conversation history for API
      const conversationHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiFetch<{
        reply: string;
        usage?: { tokens: number };
      }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: conversationHistory,
        }),
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reach AI Assistant. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const suggestions = SUGGESTIONS_BY_ROLE[userRole] || SUGGESTIONS_BY_ROLE.employee;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-md bg-surface shadow-2xl flex flex-col h-full z-10 border-l border-border animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-accent/15 text-accent rounded-control">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-navy">HCM AI Assistant</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                  Assistant
                </span>
              </div>
              <p className="text-[11px] text-muted">Scoped to your permissions & company rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-control text-muted hover:text-navy hover:bg-bg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div className={`max-w-[82%] flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-br-none shadow-sm'
                      : 'bg-bg text-text border border-border rounded-bl-none shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <span className="text-[10px] text-muted font-mono">{m.timestamp}</span>
                  {m.role === 'assistant' && (
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200">
                      AI Generated
                    </span>
                  )}
                </div>
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-bg border border-border px-3.5 py-2.5 rounded-2xl rounded-bl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
                <span className="text-xs text-muted">Consulting policy and records...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-card flex items-start gap-2.5 text-danger text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Request failed</p>
                <p className="text-[11px] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries */}
        <div className="px-4 py-2 border-t border-border/60 bg-surface/50">
          <div className="flex items-center gap-1 text-[11px] text-muted font-semibold mb-1.5">
            <HelpCircle className="w-3 h-3 text-accent" />
            <span>Suggested prompts</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {suggestions.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="text-[11px] text-left px-2.5 py-1 bg-bg hover:bg-accent/10 hover:text-accent border border-border rounded-full transition-colors text-text/80 truncate max-w-full"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Input */}
        <div className="p-4 border-t border-border bg-surface">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about policy, leaves, or metrics..."
              disabled={loading}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-control border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-bg"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-9 px-3.5 bg-accent hover:bg-accent/90 text-white rounded-control flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted mt-2">
            AI responses are generated from verified data. Respects RBAC data scopes.
          </p>
        </div>
      </div>
    </div>
  );
}
