/**
 * FanGuide AI — Input Validation Schemas (Zod)
 *
 * All API request bodies are validated with Zod before reaching
 * any business logic or the Claude API. This provides:
 *   - Type safety at the API boundary
 *   - Protection against malformed or oversized inputs
 *   - Clear validation error messages returned to clients
 *   - Defence against prompt injection via input length limits
 *
 * Zod schemas also serve as documentation — they precisely define
 * what each endpoint accepts.
 */

import { z } from 'zod';

// ── Chat Endpoint Schema ───────────────────────────────────────────────────────

/**
 * Validated schema for POST /api/chat
 * Message length is capped at 1000 chars to bound AI costs and prevent abuse.
 */
export const ChatRequestSchema = z.object({
  /** The fan's current message */
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message is too long (max 1000 characters)')
    .trim(),

  /** Context object about the fan's current situation */
  context: z.object({
    /** Seat designation (e.g., "Section 110, Row 5, Seat 12") */
    seat: z.string().max(50).optional(),

    /** Nearest gate (e.g., "gate-A") */
    gate: z
      .string()
      .regex(/^gate-[A-H]$/i, 'Invalid gate ID')
      .optional(),

    /** BCP-47 language code */
    language: z
      .enum(['en', 'es', 'fr', 'pt', 'ar'])
      .default('en'),

    /** Accessibility needs declared by the fan */
    accessibilityNeeds: z
      .array(
        z.enum([
          'wheelchair',
          'mobility-aid',
          'visual-impairment',
          'hearing-impairment',
          'sensory-sensitivity',
          'other',
        ])
      )
      .max(6)
      .optional(),

    /** ISO timestamp of current time */
    currentTime: z.string().datetime({ offset: true }).optional(),

    /** Stadium identifier */
    stadiumId: z.string().max(50).default('metlife-stadium'),

    /** Client-generated session ID for analytics (will be hashed before storage) */
    sessionId: z
      .string()
      .uuid('sessionId must be a valid UUID')
      .or(z.string().min(8).max(64)),
  }),

  /** Conversation history (last N turns for multi-turn context) */
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(10) // Limit history to last 10 turns to bound token usage
    .default([]),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ── Crowd Density Endpoint Schema ─────────────────────────────────────────────

export const CrowdZoneSchema = z.object({
  zoneId: z.string().max(50).optional(),
});

// ── Dashboard Endpoint ─────────────────────────────────────────────────────────
// Dashboard GET has no body — no schema needed.
// Auth is handled separately (simple staff toggle in this demo).
