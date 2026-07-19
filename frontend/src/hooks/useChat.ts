/**
 * FanGuide AI — Chat API Hook
 *
 * Custom hook that manages the SSE streaming chat connection with the backend.
 * Handles:
 *   - Message state (history, streaming, tool calls)
 *   - SSE event parsing and dispatching to appropriate handlers
 *   - Tool result accumulation for rich card rendering
 *   - Text-to-speech for accessibility
 *   - Error states
 *
 * The hook returns the full message list, a send function, and a loading state
 * so the UI can stay thin.
 */

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  ChatMessage,
  ChatContext,
  ToolCallAttachment,
} from '../types';

const API_URL = '/api/chat';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(context: ChatContext): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const activeToolCallsRef = useRef<Map<string, ToolCallAttachment>>(new Map());

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      // Build history from current messages (last 10 turns only)
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Create placeholder for the streaming assistant message
      const assistantId = uuidv4();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        toolAttachments: [],
      };
      setMessages((prev) => [...prev, assistantMessage]);

      activeToolCallsRef.current.clear();

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            context: {
              ...context,
              currentTime: new Date().toISOString(),
            },
            history,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        // ── Parse SSE stream ────────────────────────────────────────────────
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() ?? ''; // Keep incomplete block

          for (const block of blocks) {
            const lines = block.split('\n');
            let eventType = '';
            let eventData = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) eventType = line.slice(7);
              if (line.startsWith('data: ')) eventData = line.slice(6);
            }

            if (!eventType || !eventData) continue;

            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(eventData) as Record<string, unknown>;
            } catch {
              continue;
            }

            handleSSEEvent(eventType, parsed, assistantId);
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error && err.message.includes('HTTP')
          ? 'Could not reach the server. Is the backend running?'
          : 'Something went wrong. Please try again.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: errorMsg,
                  isStreaming: false,
                  isError: true,
                  errorCode: 'network',
                }
              : m
          )
        );
      } finally {
        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
        setIsLoading(false);
      }
    },
    [messages, context, isLoading]
  );

  function handleSSEEvent(
    eventType: string,
    data: Record<string, unknown>,
    assistantId: string
  ): void {
    switch (eventType) {
      case 'text': {
        const chunk = data.text as string;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + chunk }
              : m
          )
        );
        break;
      }

      case 'tool_call': {
        const name = data.name as string;
        const input = data.input as Record<string, unknown>;
        const toolCallId = uuidv4();

        const attachment: ToolCallAttachment = { name, input };
        activeToolCallsRef.current.set(toolCallId, attachment);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolAttachments: [...(m.toolAttachments ?? []), attachment],
                }
              : m
          )
        );
        break;
      }

      case 'tool_result': {
        const content = data.content as string;
        const isError = data.is_error as boolean;

        let result: unknown;
        try {
          result = JSON.parse(content);
        } catch {
          result = content;
        }

        // Update the most recent matching tool attachment with result
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;

            const attachments = m.toolAttachments ?? [];
            // Find last attachment without a result (the one we just got results for)
            const lastUnresolved = [...attachments].reverse().find((a) => !a.result);
            if (!lastUnresolved) return m;

            return {
              ...m,
              toolAttachments: attachments.map((a) =>
                a === lastUnresolved ? { ...a, result, isError } : a
              ),
            };
          })
        );
        break;
      }

      case 'done': {
        const isUrgent = data.isUrgent as boolean;
        if (isUrgent) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isUrgent: true } : m
            )
          );
        }
        break;
      }

      case 'error': {
        const message = data.message as string;
        const code = (data.code as string) ?? 'api_error';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: message, isStreaming: false, isError: true, errorCode: code }
              : m
          )
        );
        break;
      }
    }
  }

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}
