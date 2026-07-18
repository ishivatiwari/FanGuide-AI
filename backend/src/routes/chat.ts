/**
 * FanGuide AI — Chat Route (Gemini SDK, SSE Streaming)
 *
 * Handles POST /api/chat:
 *   1. Validates request body with Zod
 *   2. Builds system instruction (context injection)
 *   3. Calls Gemini API with function-calling tools, retrying on 429
 *   4. Executes tool calls via toolExecutor
 *   5. Streams SSE events back to the frontend: text, tool_call, tool_result, done, error
 *   6. Records anonymized analytics
 *
 * SSE Event Types (matches frontend useChat.ts):
 *   text        — { text: string }
 *   tool_call   — { name: string, input: object }
 *   tool_result — { tool_use_id: string, content: string, is_error: boolean }
 *   done        — { category: string, isUrgent: boolean }
 *   error       — { message: string, code: 'rate_limit' | 'api_error' | 'network' }
 *
 * SECURITY:
 *   - GEMINI_API_KEY never touches the client; it's read here server-side only
 *   - Input validated via Zod before any API call
 *   - Max 5 agentic rounds to prevent runaway tool loops
 *   - Error messages are always sanitized before being sent to the client
 */
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import type { Content, Part } from '@google/generative-ai';
import { ChatRequestSchema } from '../validation/schemas';
import { buildSystemInstruction } from '../claude/systemPrompt';
import { STADIUM_TOOLS } from '../claude/tools';
import { executeToolCall } from '../claude/toolExecutor';
import { recordQuery } from '../services/analytics';
import type { QueryCategory } from '../types/stadium';

export const chatRouter = Router();

// Chat rate limiter: max 20 messages per minute per IP
const chatRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please wait a minute.' },
});

chatRouter.use(chatRateLimiter);
chatRouter.post('/', (req: Request, res: Response) => {
  handleChat(req, res).catch((err) => {
    console.error('Error handling chat request:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

const MAX_TOOL_ROUNDS = 5;
const MAX_RETRY_ATTEMPTS = 3;

// Attempt to categorize the user's message for analytics
function categorizeQuery(message: string): QueryCategory {
  const lower = message.toLowerCase();
  if (/seat|section|row|gate|door|entrance|exit/.test(lower)) return 'navigation';
  if (/food|eat|drink|water|coffee|halal|vegan|allerg/.test(lower)) return 'food';
  if (/restroom|toilet|bathroom|loo|wc/.test(lower)) return 'restroom';
  if (/train|bus|shuttle|transit|taxi|uber|lyft|home|penn|newark/.test(lower)) return 'transit';
  if (/wheelchair|access|disability|lift|ramp|quiet|asl|sign/.test(lower)) return 'accessibility';
  if (/emergency|help|medic|police|security|hurt|lost|missing/.test(lower)) return 'emergency';
  if (/merch|merchandise|shop|jersey|souvenir/.test(lower)) return 'merchandise';
  return 'other';
}

function isUrgent(message: string, category: QueryCategory): boolean {
  if (category === 'emergency') return true;
  const lower = message.toLowerCase();
  return /urgent|emergency|immediately|lost child|hurt|injury|fire/.test(lower);
}

/** Writes a single SSE event to the response */
function sendSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Extracts the retry-after delay in ms from a Gemini 429 error.
 * The Gemini SDK attaches errorDetails as a structured property on the error object,
 * and also includes "Please retry in X.XXXs" in the message string.
 */
function extractRetryDelayMs(err: unknown): number {
  if (!(err instanceof Error)) return 5000;

  // 1. Check structured errorDetails (Gemini SDK attaches this)
  const anyErr = err as any;
  if (Array.isArray(anyErr.errorDetails)) {
    for (const detail of anyErr.errorDetails as Record<string, unknown>[]) {
      if (detail['@type']?.toString().includes('RetryInfo') && typeof detail.retryDelay === 'string') {
        const seconds = parseFloat(detail.retryDelay.replace('s', ''));
        if (!isNaN(seconds)) return Math.ceil(seconds * 1000) + 500;
      }
    }
  }

  // 2. Fallback: parse from message string (e.g. `"retryDelay":"7s"`)
  const jsonMatch = err.message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (jsonMatch) return Math.ceil(parseFloat(jsonMatch[1]) * 1000) + 500;

  // 3. Inline "retry in Xs"
  const inlineMatch = err.message.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (inlineMatch) return Math.ceil(parseFloat(inlineMatch[1]) * 1000) + 500;

  return 8000;
}

/** Returns true if this error is a Gemini 429 rate-limit error */
function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes('429') ||
    err.message.includes('Too Many Requests') ||
    err.message.includes('RESOURCE_EXHAUSTED') ||
    err.message.includes('free_tier');
}

/** Returns true if this error is a quota-exhausted (not retryable today) error */
function isQuotaExhaustedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Daily quota exhausted: limit is 0
  return err.message.includes('limit: 0') ||
    err.message.includes('GenerateRequestsPerDay') ||
    err.message.includes('free_tier_requests');
}

/** Sleep for a given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls model.generateContent with automatic retry on 429 rate-limit errors.
 * Uses the retry delay from the error response, with exponential backoff fallback.
 */
async function generateWithRetry(
  model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>,
  contents: Content[],
  attempt = 0
): Promise<Awaited<ReturnType<typeof model.generateContent>>> {
  try {
    return await model.generateContent({ contents });
  } catch (err) {
    // Don't retry if quota is fully exhausted for the day
    if (isQuotaExhaustedError(err)) throw err;

    if (isRateLimitError(err) && attempt < MAX_RETRY_ATTEMPTS) {
      const delay = extractRetryDelayMs(err) * Math.pow(1.5, attempt); // Exponential backoff
      console.warn(`[chat] Rate limited. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})...`);
      await sleep(delay);
      return generateWithRetry(model, contents, attempt + 1);
    }

    throw err;
  }
}

/**
 * Returns a clean, user-friendly error message.
 * Never exposes raw API errors, stack traces, or internal details.
 */
function toUserFriendlyError(err: unknown): { message: string; code: string } {
  if (!(err instanceof Error)) {
    return {
      message: "Something went wrong. Please try again.",
      code: 'api_error',
    };
  }

  if (isQuotaExhaustedError(err)) {
    return {
      message: "The AI assistant is temporarily unavailable due to high demand. Please try again later, or speak to a stadium steward for help.",
      code: 'rate_limit',
    };
  }

  if (isRateLimitError(err)) {
    return {
      message: "Too many requests right now. Please wait a few seconds and try again.",
      code: 'rate_limit',
    };
  }

  if (err.message.includes('API_KEY') || err.message.includes('401') || err.message.includes('403')) {
    return {
      message: "The AI service is not configured correctly. Please contact the help desk.",
      code: 'api_error',
    };
  }

  if (err.message.includes('fetch') || err.message.includes('ECONNREFUSED') || err.message.includes('network')) {
    return {
      message: "I'm having trouble connecting. Please check your connection and try again.",
      code: 'network',
    };
  }

  // Generic fallback — never leak internals
  return {
    message: "I encountered an issue processing your request. Please try again.",
    code: 'api_error',
  };
}

export async function handleChat(req: Request, res: Response): Promise<void> {
  // ── 1. Validate input ───────────────────────────────────────────────────────
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: parsed.error.flatten(),
    });
    return;
  }

  const { message, context, history } = parsed.data;
  const category = categorizeQuery(message);
  const urgent = isUrgent(message, category);

  // ── 2. Set up SSE stream ────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // ── 3. Initialize Gemini client ─────────────────────────────────────────────
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: buildSystemInstruction(context),
    tools: STADIUM_TOOLS,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
  });

  // ── 4. Build conversation history (Gemini Content[] format) ─────────────────
  const conversationHistory: Content[] = history.map((h: { role: 'user' | 'assistant'; content: string }) => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }));

  // Add the current user message
  conversationHistory.push({
    role: 'user',
    parts: [{ text: message }],
  });

  // ── 5. Agentic tool-call loop ────────────────────────────────────────────────
  try {
    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++;

      const result = await generateWithRetry(model, conversationHistory);

      const response = result.response;
      const candidate = response.candidates?.[0];
      if (!candidate) throw new Error('No candidate in Gemini response');

      const parts = candidate.content?.parts ?? [];
      let hasFunctionCalls = false;
      const functionResponses: Part[] = [];

      for (const part of parts) {
        if (part.text) {
          sendSSE(res, 'text', { text: part.text });
        }

        if (part.functionCall) {
          hasFunctionCalls = true;
          const { name, args } = part.functionCall;
          const toolInput = (args ?? {}) as Record<string, unknown>;

          sendSSE(res, 'tool_call', { name, input: toolInput });

          let toolResult: unknown;
          let isError = false;
          try {
            toolResult = await executeToolCall(name, toolInput);
          } catch (err) {
            isError = true;
            toolResult = {
              error: err instanceof Error ? err.message : 'Tool execution failed',
            };
          }

          const resultStr = JSON.stringify(toolResult);
          sendSSE(res, 'tool_result', {
            tool_use_id: name,
            content: resultStr,
            is_error: isError,
          });

          functionResponses.push({
            functionResponse: {
              name,
              response: { result: toolResult },
            },
          });
        }
      }

      conversationHistory.push({ role: 'model', parts });

      if (hasFunctionCalls && functionResponses.length > 0) {
        conversationHistory.push({ role: 'user', parts: functionResponses });
      } else {
        break;
      }
    }

    // ── 6. Record analytics (async, best-effort) ──────────────────────────────
    try {
      recordQuery(context.sessionId, category, urgent);
    } catch (err) {
      console.error('Failed to record analytics query:', err);
    }

    // ── 7. Signal stream end ─────────────────────────────────────────────────
    sendSSE(res, 'done', { category, isUrgent: urgent });
    res.end();
  } catch (err) {
    // Always log the full error server-side for debugging
    console.error('[chat] Error calling Gemini API:', err instanceof Error ? err.message : err);

    // But only send a clean, user-friendly message to the client
    const { message: userMessage, code } = toUserFriendlyError(err);
    sendSSE(res, 'error', { message: userMessage, code });
    res.end();
  }
}
