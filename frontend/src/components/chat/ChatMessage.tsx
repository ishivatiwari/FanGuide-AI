/**
 * FanGuide AI — Chat Message Component
 *
 * Renders a single chat message (user or assistant).
 * For assistant messages, also renders rich tool result cards.
 *
 * Accessibility:
 *   - aria-label on each message identifies role and content
 *   - Streaming indicator is announced via aria-live (set on the container)
 *   - Urgent messages get a visible warning banner
 *   - Text-to-speech: if enabled, speaks new assistant messages via Web Speech API
 */

import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import type { ChatMessage } from '../../types';
import { ToolResultRenderer } from './ToolResultRenderer';
import { useAppContext } from '../../context/AppContext';

interface ChatMessageProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const { state } = useAppContext();
  const isUser = message.role === 'user';
  const spokenRef = useRef(false);

  // Text-to-speech for assistant messages
  useEffect(() => {
    if (
      !isUser &&
      !message.isStreaming &&
      state.accessibility.textToSpeech &&
      message.content &&
      !spokenRef.current &&
      'speechSynthesis' in window
    ) {
      spokenRef.current = true;
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.lang = state.chatContext.language;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [message.isStreaming, message.content, isUser, state.accessibility.textToSpeech, state.chatContext.language]);

  return (
    <article
      className={clsx('flex w-full gap-3 message-enter', isUser ? 'flex-row-reverse' : 'flex-row')}
      aria-label={`${isUser ? 'You' : 'FanGuide AI'}: ${message.content.slice(0, 100)}${message.content.length > 100 ? '...' : ''}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1" aria-hidden="true">
        {isUser ? (
          <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-sm font-bold shadow-brand-glow border border-brand-400/30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
          </div>
        ) : (
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gold-gradient flex items-center justify-center text-base shadow-gold-glow border border-gold-400/30">
              ⚽
            </div>
            {/* Live indicator */}
            {message.isStreaming && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-stadium-dark animate-pulse" />
            )}
          </div>
        )}
      </div>

      <div className={clsx('flex flex-col gap-1 max-w-[82%]', isUser ? 'items-end' : 'items-start')}>
        {/* Urgent banner */}
        {message.isUrgent && !isUser && (
          <div
            className="w-full rounded-xl px-3 py-2 text-xs text-red-300 flex items-center gap-2 border animate-scale-in"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.08) 100%)',
              borderColor: 'rgba(239,68,68,0.4)',
            }}
            role="alert"
            aria-live="assertive"
          >
            <span aria-hidden="true">⚠️</span>
            <strong>Urgent — please find a steward immediately</strong>
          </div>
        )}

        {/* Message bubble */}
        {isUser ? (
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #3060ff 0%, #5580ff 100%)',
              boxShadow: '0 2px 16px rgba(48,96,255,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
              }}
            />
            <span className="relative">{message.content}</span>
          </div>
        ) : message.isError ? (
          /* ── Error card (styled, never raw API text) ── */
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed animate-scale-in"
            style={{
              background: message.errorCode === 'rate_limit'
                ? 'rgba(245, 158, 11, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${message.errorCode === 'rate_limit' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
              borderLeft: `2px solid ${message.errorCode === 'rate_limit' ? '#f59e0b' : '#ef4444'}`,
            }}
            role="alert"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">
                {message.errorCode === 'rate_limit' ? '⏱️' : message.errorCode === 'network' ? '📡' : '⚠️'}
              </span>
              <div>
                <p className={clsx(
                  'font-semibold text-xs uppercase tracking-wide mb-1',
                  message.errorCode === 'rate_limit' ? 'text-amber-400' : 'text-red-400'
                )}>
                  {message.errorCode === 'rate_limit' ? 'Service Busy' : message.errorCode === 'network' ? 'Connection Error' : 'Assistant Error'}
                </p>
                <p className="text-gray-300 text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          </div>
        ) : (
          /* ── Normal AI bubble ── */
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed text-gray-100 relative"
            style={{
              background: 'rgba(17, 31, 58, 0.85)',
              border: '1px solid rgba(48, 96, 255, 0.18)',
              borderLeft: '2px solid rgba(255, 200, 10, 0.5)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {message.content || (
              // Typing indicator when streaming and no content yet
              <div className="flex items-center gap-1.5 py-1" aria-label="FanGuide AI is typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            )}

            {/* Streaming cursor */}
            {message.isStreaming && message.content && (
              <span
                className="inline-block w-0.5 h-3.5 bg-brand-400 ml-1 animate-pulse align-middle rounded-full"
                aria-hidden="true"
              />
            )}
          </div>
        )}

        {/* Rich tool result cards */}
        {!isUser && message.toolAttachments && message.toolAttachments.length > 0 && (
          <div className="w-full space-y-1.5 mt-0.5" aria-label="Additional information">
            {message.toolAttachments.map((attachment, idx) => (
              <ToolResultRenderer key={`${attachment.name}-${idx}`} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <time
          className="text-[10px] text-stadium-light opacity-70 px-1"
          dateTime={message.timestamp.toISOString()}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </article>
  );
}
