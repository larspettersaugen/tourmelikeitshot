'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';

interface AiChatProps {
  role?: string;
  userName?: string | null;
}

function getTextFromParts(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text)
    .join('');
}

export function AiChat({ role, userName }: AiChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxPx = 160;
    el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`;
    el.style.overflowY = el.scrollHeight > maxPx ? 'auto' : 'hidden';
  }, []);

  const { messages, sendMessage, status, error } = useChat();

  const isLoading = status === 'submitted' || status === 'streaming';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, scrollToBottom]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      resizeTextarea();
    }
  }, [open, resizeTextarea]);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function submitMessage() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage({ text });
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.style.height = 'auto';
        el.style.overflowY = 'hidden';
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMessage();
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  }

  const greeting =
    role === 'viewer'
      ? `Hi${userName ? ` ${userName.split(' ')[0]}` : ''}! Ask me about your upcoming dates, schedule, or travel.`
      : `Hi${userName ? ` ${userName.split(' ')[0]}` : ''}! I can help you find info about tours, dates, people, and more.`;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-12 w-12 rounded-full bg-stage-neonCyan text-stage-page shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-36 right-4 md:bottom-20 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm flex flex-col rounded-xl border border-stage-border bg-stage-card shadow-2xl overflow-hidden"
          style={{ maxHeight: 'min(70vh, 560px)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stage-border bg-stage-surface shrink-0">
            <Sparkles className="h-4 w-4 text-stage-neonCyan shrink-0" />
            <span className="text-sm font-medium text-stage-fg truncate">
              Tour Assistant
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-stage-muted">{greeting}</p>
            )}
            {messages.map((m) => {
              const text = getTextFromParts(m.parts as Array<{ type: string; text?: string }>);
              if (!text) return null;
              return (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                      m.role === 'user'
                        ? 'bg-stage-neonCyan/15 text-stage-fg'
                        : 'bg-stage-surface text-stage-fg'
                    }`}
                  >
                    {text}
                  </div>
                </div>
              );
            })}
            {isLoading && (!messages.length || messages[messages.length - 1]?.role !== 'assistant' ||
              !getTextFromParts(messages[messages.length - 1].parts as Array<{ type: string; text?: string }>)) && (
              <div className="flex justify-start">
                <div className="bg-stage-surface rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-stage-muted" />
                </div>
              </div>
            )}
            {error && (
              <p className="text-sm text-red-400">
                Something went wrong. Please try again.
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 flex items-end gap-2 px-3 py-3 border-t border-stage-border bg-stage-surface"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ask anything..."
              className="flex-1 min-w-0 min-h-[2.5rem] max-h-40 resize-none bg-stage-card border border-stage-border rounded-lg px-3 py-2 text-sm text-stage-fg placeholder:text-stage-muted focus:outline-none focus:border-stage-neonCyan leading-snug"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="shrink-0 h-9 w-9 rounded-lg bg-stage-neonCyan text-stage-page flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
