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
      <div
        className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-1',
          isUser
            ? 'bg-brand-500 text-white'
            : 'bg-gold-gradient text-stadium-dark'
        )}
        aria-hidden="true"
      >
        {isUser ? '👤' : '⚽'}
      </div>

      <div className={clsx('flex flex-col gap-1 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        {/* Urgent banner */}
        {message.isUrgent && !isUser && (
          <div
            className="w-full bg-red-500/20 border border-red-500/50 rounded-lg px-3 py-2 text-xs text-red-300 flex items-center gap-2"
            role="alert"
            aria-live="assertive"
          >
            <span aria-hidden="true">⚠️</span>
            <strong>Urgent — please find a steward immediately</strong>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={clsx(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-brand-500 text-white rounded-tr-sm'
              : 'bg-stadium-card text-gray-100 rounded-tl-sm border border-stadium-border'
          )}
        >
          {message.content || (
            // Typing indicator when streaming and no content yet
            <div className="flex items-center gap-1.5 py-1" aria-label="FanGuide AI is typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}

          {/* Streaming indicator */}
          {message.isStreaming && message.content && (
            <span
              className="inline-block w-0.5 h-4 bg-brand-400 ml-1 animate-pulse align-middle"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Rich tool result cards */}
        {!isUser && message.toolAttachments && message.toolAttachments.length > 0 && (
          <div className="w-full space-y-1" aria-label="Additional information">
            {message.toolAttachments.map((attachment, idx) => (
              <ToolResultRenderer key={`${attachment.name}-${idx}`} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <time
          className="text-[10px] text-stadium-light"
          dateTime={message.timestamp.toISOString()}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </article>
  );
}
