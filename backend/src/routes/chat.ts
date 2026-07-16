/**
 * FanGuide AI — Chat Route (Gemini SDK, SSE Streaming)
 *
 * Handles POST /api/chat:
 *   1. Validates request body with Zod
 *   2. Builds system instruction (context injection)
 *   3. Calls Gemini API with function-calling tools
 *   4. Executes tool calls via toolExecutor
 *   5. Streams SSE events back to the frontend: text, tool_call, tool_result, done, error
 *   6. Records anonymized analytics
 *
 * SSE Event Types (matches frontend useChat.ts):
 *   text        — { text: string }
 *   tool_call   — { name: string, input: object }
 *   tool_result — { tool_use_id: string, content: string, is_error: boolean }
 *   done        — { category: string, isUrgent: boolean }
 *   error       — { message: string }
 *
 * SECURITY:
 *   - GEMINI_API_KEY never touches the client; it's read here server-side only
 *   - Input validated via Zod before any API call
 *   - Max 5 agentic rounds to prevent runaway tool loops
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

      const result = await model.generateContent({
        contents: conversationHistory,
      });

      const response = result.response;
      const candidate = response.candidates?.[0];
      if (!candidate) throw new Error('No candidate in Gemini response');

      const parts = candidate.content?.parts ?? [];
      let hasFunctionCalls = false;
      const functionResponses: Part[] = [];

      for (const part of parts) {
        if (part.text) {
          // Text chunk — stream to frontend
          sendSSE(res, 'text', { text: part.text });
        }

        if (part.functionCall) {
          hasFunctionCalls = true;
          const { name, args } = part.functionCall;
          const toolInput = (args ?? {}) as Record<string, unknown>;

          // Notify frontend a tool call is happening
          sendSSE(res, 'tool_call', { name, input: toolInput });

          // Execute the tool
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
          // Notify frontend of the result
          sendSSE(res, 'tool_result', {
            tool_use_id: name,
            content: resultStr,
            is_error: isError,
          });

          // Prepare function response for next Gemini round
          functionResponses.push({
            functionResponse: {
              name,
              response: { result: toolResult },
            },
          });
        }
      }

      // Append the model's response to the conversation
      conversationHistory.push({
        role: 'model',
        parts,
      });

      if (hasFunctionCalls && functionResponses.length > 0) {
        // Append function results and continue the loop
        conversationHistory.push({
          role: 'user',
          parts: functionResponses,
        });
        // Continue the while loop for the next round
      } else {
        // No function calls — we're done
        break;
      }
    }

    // ── 6. Record analytics (async, best-effort) ──────────────────────────────
    try {
      recordQuery(context.sessionId, category, urgent);
    } catch (err) {
      // Non-fatal: analytics failures should not affect the response
      console.error('Failed to record analytics query:', err);
    }

    // ── 7. Signal stream end ─────────────────────────────────────────────────
    sendSSE(res, 'done', { category, isUrgent: urgent });
    res.end();
  } catch (err) {
    console.error('[chat] Error calling Gemini API:', err);

    const errorMessage =
      process.env.NODE_ENV === 'production'
        ? "I'm having trouble connecting right now. Please try again or find a staff member."
        : `AI error: ${err instanceof Error ? err.message : String(err)}`;

    sendSSE(res, 'error', { message: errorMessage });
    res.end();
  }
}
