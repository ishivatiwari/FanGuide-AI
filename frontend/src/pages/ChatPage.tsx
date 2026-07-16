/**
 * FanGuide AI — Chat Page
 *
 * The primary fan-facing view. Centers the chat interface with:
 *   - Welcome message on first load
 *   - Quick action chips (common queries)
 *   - Scrollable message list with tool result cards
 *   - Input bar with send button and character counter
 *   - Keyboard shortcut: Enter to send, Shift+Enter for newline
 *
 * Accessibility:
 *   - aria-live="polite" region for new messages
 *   - Textarea has explicit label
 *   - Send button has descriptive aria-label
 *   - Auto-scroll to newest message
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useChat } from '../hooks/useChat';
import { useAppContext } from '../context/AppContext';
import { ChatMessageBubble } from '../components/chat/ChatMessage';
import { clsx } from 'clsx';

const QUICK_ACTIONS = [
  { label: '🪑 Find my seat', message: 'How do I get to my seat?' },
  { label: '🚻 Restroom', message: 'Where is the nearest accessible restroom?' },
  { label: '🍔 Food options', message: 'Where can I find halal or vegan food?' },
  { label: '🚇 Getting home', message: 'How do I get to Penn Station after the match?' },
  { label: '♿ Accessibility', message: 'What accessibility services are available at my gate?' },
];

const MAX_MESSAGE_LENGTH = 1000;

export function ChatPage() {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { messages, isLoading, sendMessage } = useChat(state.chatContext);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputId = 'chat-input';

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading || trimmed.length > MAX_MESSAGE_LENGTH) return;
    sendMessage(trimmed);
    setInputValue('');
    textareaRef.current?.focus();
  }, [inputValue, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-w-2xl mx-auto">
      {/* ── Messages Area ───────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
      >
        {/* Welcome screen */}
        {showWelcome && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 animate-fade-in px-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gold-gradient flex items-center justify-center text-4xl shadow-gold-glow">
                ⚽
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-sm border-2 border-stadium-dark">
                🤖
              </div>
            </div>

            <div>
              <h1 className="text-xl font-bold text-white mb-1">
                {t('app.name')}
              </h1>
              <p className="text-stadium-light text-sm max-w-xs">
                {t('app.tagline')}
              </p>
            </div>

            <p className="text-gray-300 text-sm max-w-sm leading-relaxed">
              {t('chat.welcome')}
            </p>

            {/* Quick action chips */}
            <div
              className="flex flex-wrap gap-2 justify-center mt-2"
              role="group"
              aria-label="Quick questions"
            >
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.message)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-full text-sm bg-stadium-card border border-stadium-border text-gray-300 hover:border-brand-500/50 hover:text-white transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}

        {/* Loading indicator for new round of tool calls */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-3 animate-fade-in" aria-label="FanGuide AI is thinking">
            <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center text-sm flex-shrink-0">
              ⚽
            </div>
            <div className="bg-stadium-card border border-stadium-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
              <p className="text-xs text-stadium-light mt-1">{t('chat.thinking')}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* ── Input Bar ──────────────────────────────────────────────────────── */}
      <div className="border-t border-stadium-border bg-stadium-dark/95 backdrop-blur px-4 py-3">
        {/* Context indicator */}
        {(state.chatContext.seat || state.chatContext.gate) && (
          <div className="flex items-center gap-2 mb-2 text-xs text-stadium-light">
            <span aria-hidden="true">📍</span>
            <span>
              {state.chatContext.gate && `Gate ${state.chatContext.gate.replace('gate-', '')}`}
              {state.chatContext.seat && state.chatContext.gate && ' · '}
              {state.chatContext.seat}
            </span>
          </div>
        )}

        <div className="flex items-end gap-2">
          <label htmlFor={inputId} className="sr-only">
            {t('chat.placeholder')}
          </label>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              id={inputId}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              disabled={isLoading}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={1}
              aria-describedby="input-hint"
              className={clsx(
                'w-full bg-stadium-card border rounded-2xl px-4 py-3 pr-16 text-sm text-white resize-none',
                'placeholder:text-stadium-light',
                'focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500/60',
                'disabled:opacity-60',
                inputValue.length > MAX_MESSAGE_LENGTH - 50
                  ? 'border-amber-500/60'
                  : 'border-stadium-border',
                'transition-all min-h-[48px] max-h-32',
                'field-sizing-content' // Modern browser auto-resize
              )}
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />

            {/* Character counter */}
            {inputValue.length > 900 && (
              <span
                className="absolute right-14 bottom-3 text-xs text-amber-400"
                aria-live="polite"
                aria-label={`${MAX_MESSAGE_LENGTH - inputValue.length} characters remaining`}
              >
                {MAX_MESSAGE_LENGTH - inputValue.length}
              </span>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            aria-label={`${t('chat.send')} message`}
            className={clsx(
              'flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center',
              'transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
              isLoading || !inputValue.trim()
                ? 'bg-stadium-card text-stadium-light cursor-not-allowed'
                : 'bg-brand-500 text-white hover:bg-brand-400 shadow-brand-glow'
            )}
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>

        <p id="input-hint" className="sr-only">
          Press Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
