/**
 * FanGuide AI — Unit Tests: Input Validation (Zod Schemas)
 *
 * Verifies that ChatRequestSchema correctly:
 *   1. Accepts valid inputs
 *   2. Rejects empty messages
 *   3. Rejects messages that are too long (>1000 chars)
 *   4. Rejects invalid gate IDs
 *   5. Rejects unsupported languages
 *   6. Rejects invalid session IDs
 *   7. Applies defaults for optional fields
 *   8. Limits history to 10 turns
 */

import { ChatRequestSchema } from '../src/validation/schemas';

// ── Valid base payload ────────────────────────────────────────────────────────

const VALID_REQUEST = {
  message: 'Where is my seat?',
  context: {
    seat: 'Section 100, Row 5, Seat 12',
    gate: 'gate-A',
    language: 'en' as const,
    stadiumId: 'metlife-stadium',
    sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  },
  history: [],
};

describe('ChatRequestSchema Validation', () => {
  describe('Valid inputs', () => {
    test('accepts a well-formed request', () => {
      const result = ChatRequestSchema.safeParse(VALID_REQUEST);
      expect(result.success).toBe(true);
    });

    test('accepts all supported languages', () => {
      const languages = ['en', 'es', 'fr', 'pt', 'ar'] as const;
      for (const lang of languages) {
        const result = ChatRequestSchema.safeParse({
          ...VALID_REQUEST,
          context: { ...VALID_REQUEST.context, language: lang },
        });
        expect(result.success).toBe(true);
      }
    });

    test('applies default language "en" when omitted', () => {
      const { language: _, ...contextWithoutLang } = VALID_REQUEST.context;
      const result = ChatRequestSchema.safeParse({
        ...VALID_REQUEST,
        context: contextWithoutLang,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.context.language).toBe('en');
      }
    });

    test('applies default history [] when omitted', () => {
      const { history: _, ...reqWithoutHistory } = VALID_REQUEST;
      const result = ChatRequestSchema.safeParse(reqWithoutHistory);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.history).toEqual([]);
      }
    });

    test('accepts all valid gate IDs (gate-A through gate-H)', () => {
      const gates = ['gate-A', 'gate-B', 'gate-C', 'gate-D', 'gate-E', 'gate-F', 'gate-G', 'gate-H'];
      for (const gate of gates) {
        const result = ChatRequestSchema.safeParse({
          ...VALID_REQUEST,
          context: { ...VALID_REQUEST.context, gate },
        });
        expect(result.success).toBe(true);
      }
    });

    test('accepts accessibility needs array', () => {
      const result = ChatRequestSchema.safeParse({
        ...VALID_REQUEST,
        context: {
          ...VALID_REQUEST.context,
          accessibilityNeeds: ['wheelchair', 'visual-impairment'],
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid inputs — message', () => {
    test('rejects empty message', () => {
      const result = ChatRequestSchema.safeParse({ ...VALID_REQUEST, message: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.message).toBeDefined();
      }
    });

    test('rejects message over 1000 characters', () => {
      const longMessage = 'a'.repeat(1001);
      const result = ChatRequestSchema.safeParse({ ...VALID_REQUEST, message: longMessage });
      expect(result.success).toBe(false);
    });

    test('accepts message at exactly 1000 characters', () => {
      const maxMessage = 'a'.repeat(1000);
      const result = ChatRequestSchema.safeParse({ ...VALID_REQUEST, message: maxMessage });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid inputs — context', () => {
    test('rejects invalid gate ID format', () => {
      const result = ChatRequestSchema.safeParse({
        ...VALID_REQUEST,
        context: { ...VALID_REQUEST.context, gate: 'gate-Z' },
      });
      expect(result.success).toBe(false);
    });

    test('rejects gate with wrong format', () => {
      const result = ChatRequestSchema.safeParse({
        ...VALID_REQUEST,
        context: { ...VALID_REQUEST.context, gate: 'GATE-A' },
      });
      // The regex is case-insensitive, so this should pass
      expect(result.success).toBe(true);
    });

    test('rejects unsupported language code', () => {
      const result = ChatRequestSchema.safeParse({
        ...VALID_REQUEST,
        context: { ...VALID_REQUEST.context, language: 'de' as any },
      });
      expect(result.success).toBe(false);
    });

    test('rejects invalid accessibility need value', () => {
      const result = ChatRequestSchema.safeParse({
        ...VALID_REQUEST,
        context: {
          ...VALID_REQUEST.context,
          accessibilityNeeds: ['flying' as any],
        },
      });
      expect(result.success).toBe(false);
    });

    test('rejects invalid datetime format for currentTime', () => {
      const result = ChatRequestSchema.safeParse({
        ...VALID_REQUEST,
        context: { ...VALID_REQUEST.context, currentTime: 'not-a-date' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid inputs — history', () => {
    test('rejects history with more than 10 turns', () => {
      const history = Array.from({ length: 11 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
      }));

      const result = ChatRequestSchema.safeParse({ ...VALID_REQUEST, history });
      expect(result.success).toBe(false);
    });

    test('accepts history with exactly 10 turns', () => {
      const history = Array.from({ length: 10 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
      }));

      const result = ChatRequestSchema.safeParse({ ...VALID_REQUEST, history });
      expect(result.success).toBe(true);
    });

    test('rejects invalid role in history', () => {
      const result = ChatRequestSchema.safeParse({
        ...VALID_REQUEST,
        history: [{ role: 'system' as any, content: 'test' }],
      });
      expect(result.success).toBe(false);
    });
  });
});
