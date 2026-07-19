/**
 * FanGuide AI — Chat Page
 *
 * The primary fan-facing view. In the 3-zone command-center layout,
 * this fills the center column (sidebar to left, context panel to right).
 *
 * Features:
 *   - Welcome state with branded illustration + quick-action chips
 *   - Scrollable message list with tool result cards
 *   - Input bar with send button and character counter
 *   - Custom "thinking" animation (pulsing ⚽ + breathing dots)
 *   - Message bubbles fade + slide in on arrival
 *   - Quick actions: icon + label, glow/scale on hover
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
  { emoji: '🪑', labelKey: 'chat.action.seat',          messageKey: 'chat.action.seat.message' },
  { emoji: '🚻', labelKey: 'chat.action.restroom',      messageKey: 'chat.action.restroom.message' },
  { emoji: '🍔', labelKey: 'chat.action.food',          messageKey: 'chat.action.food.message' },
  { emoji: '🚇', labelKey: 'chat.action.transit',       messageKey: 'chat.action.transit.message' },
  { emoji: '♿', labelKey: 'chat.action.accessibility',  messageKey: 'chat.action.accessibility.message' },
  { emoji: '🚪', labelKey: 'chat.action.exit',           messageKey: 'chat.action.exit.message' },
  { emoji: '🌐', labelKey: 'chat.action.translate',      messageKey: 'chat.action.translate.message' },
];

const MAX_MESSAGE_LENGTH = 1000;

export function ChatPage() {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { messages, isLoading, sendMessage } = useChat(state.chatContext);
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
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
  const isNearLimit = inputValue.length > MAX_MESSAGE_LENGTH - 50;
  const canSend = inputValue.trim().length > 0 && !isLoading;

  return (
    <div className="flex flex-col h-[calc(100dvh-57px)]">
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
          <div className="flex flex-col items-center justify-center h-full text-center gap-5 px-4 max-w-lg mx-auto">

            {/* Hero section */}
            <div className="relative animate-fade-in">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,200,10,0.2) 0%, transparent 70%)',
                  transform: 'scale(2)',
                }}
              />
              <div className="relative w-20 h-20 rounded-full bg-gold-gradient flex items-center justify-center text-4xl shadow-gold-glow-lg animate-float">
                ⚽
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-gradient flex items-center justify-center text-xs font-bold border-2 border-stadium-dark shadow-brand-glow">
                AI
              </div>
            </div>

            {/* Title block */}
            <div className="space-y-1.5 animate-fade-in stagger-1" style={{ animationFillMode: 'both' }}>
              <h1 className="text-2xl font-black tracking-tight" style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #ffc80a 60%, #ffffff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {t('app.name')}
              </h1>
              <p className="text-sm text-stadium-light max-w-xs leading-relaxed">
                {t('app.tagline')}
              </p>
            </div>

            {/* Welcome text */}
            <p
              className="text-gray-400 text-sm max-w-xs leading-relaxed animate-fade-in stagger-2"
              style={{ animationFillMode: 'both' }}
            >
              {t('chat.welcome')}
            </p>

            {/* Quick action chips — icon + label grid */}
            <div
              className="w-full grid grid-cols-1 gap-2 mt-1 animate-fade-in stagger-3"
              style={{ animationFillMode: 'both' }}
              role="group"
              aria-label="Quick questions"
            >
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={action.labelKey}
                  onClick={() => sendMessage(t(action.messageKey))}
                  disabled={isLoading}
                  className={clsx(
                    'quick-action-chip',
                    `stagger-${Math.min(i + 1, 7)}`,
                  )}
                  style={{ animationFillMode: 'both' }}
                  aria-label={t(action.messageKey)}
                >
                  <span className="quick-action-chip-icon" aria-hidden="true">
                    {action.emoji}
                  </span>
                  <span className="flex-1 text-left text-sm font-medium">
                    {t(action.labelKey)}
                  </span>
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="w-3.5 h-3.5 text-stadium-light flex-shrink-0 opacity-50"
                    aria-hidden="true"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Subtle hint */}
            <p
              className="text-[11px] text-stadium-light animate-fade-in stagger-7"
              style={{ animationFillMode: 'both' }}
            >
              Press{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-stadium-card border border-stadium-border text-[10px] font-mono">
                Enter
              </kbd>{' '}
              to send · <span className="font-data text-[11px]">Shift+Enter</span> for newline
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}

        {/* Loading / Thinking indicator */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div
            className="flex items-center gap-3 animate-fade-in"
            aria-label="FanGuide AI is thinking"
            role="status"
          >
            {/* Pulsing avatar */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-full border border-gold-400/30 animate-ping" />
              <div className="w-9 h-9 rounded-full bg-gold-gradient flex items-center justify-center text-base shadow-gold-glow">
                ⚽
              </div>
            </div>

            <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 shadow-card-sm">
              <div className="flex items-center gap-2">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
              </div>
              <p className="text-xs text-stadium-light mt-1.5 font-data tracking-wide">
                {t('chat.thinking')}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* ── Input Bar ──────────────────────────────────────────────────────── */}
      <div
        className={clsx(
          'border-t px-4 py-3 transition-all duration-300',
          isFocused
            ? 'border-gold-500/30 bg-stadium-dark/98'
            : 'border-stadium-border/40 bg-stadium-dark/95',
          'backdrop-blur-md',
        )}
      >
        {/* Context indicator */}
        {(state.chatContext.seat || state.chatContext.gate) && (
          <div className="flex items-center gap-2 mb-2 text-xs text-stadium-light">
            <span
              className="w-1.5 h-1.5 rounded-full bg-pitch-400 flex-shrink-0 animate-pulse"
              aria-hidden="true"
            />
            <span className="font-data text-[10px] tracking-wider">
              {state.chatContext.gate && `Gate ${state.chatContext.gate.replace('gate-', '').toUpperCase()}`}
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
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t('chat.placeholder')}
              disabled={isLoading}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={1}
              aria-describedby="input-hint"
              className={clsx(
                'w-full rounded-2xl px-4 py-3 pr-16 text-sm text-white resize-none transition-all',
                'placeholder:text-stadium-light',
                'focus:outline-none',
                'disabled:opacity-60',
                'min-h-[48px] max-h-32',
                'field-sizing-content',
                isNearLimit
                  ? 'bg-amber-950/40 border border-amber-500/50'
                  : 'bg-stadium-card/70 border border-stadium-border/50',
                isFocused && !isNearLimit
                  ? 'border-gold-500/40 shadow-[0_0_0_3px_rgba(255,200,10,0.08)]'
                  : '',
              )}
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />

            {/* Character counter */}
            {inputValue.length > 900 && (
              <span
                className="absolute right-14 bottom-3 text-xs text-amber-400 font-data"
                aria-live="polite"
                aria-label={`${MAX_MESSAGE_LENGTH - inputValue.length} characters remaining`}
              >
                {MAX_MESSAGE_LENGTH - inputValue.length}
              </span>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label={`${t('chat.send')} message`}
            className={clsx(
              'flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
              canSend
                ? 'bg-gold-gradient text-stadium-dark shadow-gold-glow hover:shadow-gold-glow-lg hover:scale-105 active:scale-95'
                : 'bg-stadium-card text-stadium-light cursor-not-allowed border border-stadium-border/40',
            )}
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={clsx('w-4 h-4 transition-transform', canSend && 'translate-x-0.5 -translate-y-0.5')}
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
