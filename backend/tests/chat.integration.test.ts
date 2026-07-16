/**
 * FanGuide AI — Integration Tests: Chat Endpoint
 *
 * Tests the full /api/chat endpoint with a mocked Google Gemini AI SDK.
 * Verifies the complete request → validation → Gemini call → tool-call loop
 * → tool-result → final-answer → SSE stream pipeline works end-to-end.
 *
 * The Gemini SDK is mocked so these tests run without an API key
 * and without making real API calls (fast, deterministic, free).
 *
 * Test scenarios:
 *   1. Simple text response (no tool calls)
 *   2. Tool-call → tool-result → final-answer loop
 *   3. Validation failure (empty message)
 *   4. Gemini API error gracefully handled
 */

import request from 'supertest';
import { createApp } from '../src/app';

// ── Mock Google Generative AI SDK ─────────────────────────────────────────────
jest.mock('@google/generative-ai');

import { GoogleGenerativeAI } from '@google/generative-ai';
const MockGoogleGenerativeAI = GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>;

// ── Mock data services ────────────────────────────────────────────────────────
jest.mock('../src/data/dataLoader');
jest.mock('../src/services/crowdDensity');
jest.mock('../src/pathfinding/dijkstra');
jest.mock('../src/services/waitTime');
jest.mock('../src/services/transport');
jest.mock('../src/services/accessibility');

import { getStadiumGraph } from '../src/data/dataLoader';
import { findRoute } from '../src/pathfinding/dijkstra';
import { getAllCrowdDensity } from '../src/services/crowdDensity';

const mockGetGraph = getStadiumGraph as jest.MockedFunction<typeof getStadiumGraph>;
const mockFindRoute = findRoute as jest.MockedFunction<typeof findRoute>;
const mockGetAllCrowdDensity = getAllCrowdDensity as jest.MockedFunction<typeof getAllCrowdDensity>;

// ── Test setup ────────────────────────────────────────────────────────────────

const VALID_BODY = {
  message: 'How do I get to my seat?',
  context: {
    seat: 'Section 100, Row 5, Seat 12',
    gate: 'gate-A',
    language: 'en',
    stadiumId: 'metlife-stadium',
    sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  },
  history: [],
};

/** Parses SSE stream text into an array of {event, data} objects */
function parseSSE(text: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  const blocks = text.split('\n\n').filter(Boolean);
  for (const block of blocks) {
    const lines = block.split('\n');
    let event = '';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7);
      if (line.startsWith('data: ')) data = line.slice(6);
    }
    if (event && data) {
      try { events.push({ event, data: JSON.parse(data) }); } catch { /* skip */ }
    }
  }
  return events;
}

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  process.env.GEMINI_API_KEY = 'test-key-not-real';
  process.env.NODE_ENV = 'test';

  mockGetGraph.mockReturnValue({ nodes: [], edges: [] } as any);
  mockGetAllCrowdDensity.mockReturnValue({ zones: {}, lastRefreshed: new Date().toISOString() });

  app = createApp();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGraph.mockReturnValue({ nodes: [], edges: [] } as any);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/chat — Integration', () => {
  test('returns 400 for empty message', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ ...VALID_BODY, message: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request');
  });

  test('returns 400 for message exceeding 1000 chars', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ ...VALID_BODY, message: 'x'.repeat(1001) });

    expect(res.status).toBe(400);
  });

  test('streams SSE response for a simple text reply (no tool calls)', async () => {
    // Mock Gemini returning a direct text answer without function calls
    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ text: 'Your seat is in Section 100, Row 5.' }],
            },
            finishReason: 'STOP',
          },
        ],
      },
    });

    MockGoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: mockGenerateContent,
      }),
    } as any));

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);

    const events = parseSSE(res.body as string);
    const textEvents = events.filter((e) => e.event === 'text');
    const doneEvents = events.filter((e) => e.event === 'done');

    expect(textEvents.length).toBeGreaterThan(0);
    expect((textEvents[0].data as any).text).toContain('Section 100');
    expect(doneEvents.length).toBe(1);
  });

  test('executes tool-call loop: getRoute call → tool result → final answer', async () => {
    // Mock route for tool execution
    mockFindRoute.mockReturnValue({
      from: 'gate-A',
      to: 'section-100',
      totalDurationSeconds: 120,
      steps: [],
      accessibilityMode: false,
      nodePath: ['gate-A', 'concourse-N', 'section-100'],
    });

    // Round 1: Gemini calls getRoute
    // Round 2: Gemini gives final answer after seeing tool result
    const mockGenerateContent = jest.fn()
      .mockResolvedValueOnce({
        response: {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  { text: 'Let me find your route.' },
                  {
                    functionCall: {
                      name: 'getRoute',
                      args: { from: 'gate-A', to: 'section-100', accessibilityMode: false },
                    },
                  },
                ],
              },
              finishReason: 'STOP',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        response: {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  { text: 'Head to North Concourse, then to Section 100. About 2 minutes walk.' },
                ],
              },
              finishReason: 'STOP',
            },
          ],
        },
      });

    MockGoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: mockGenerateContent,
      }),
    } as any));

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    expect(res.status).toBe(200);

    const events = parseSSE(res.body as string);
    const toolCallEvents = events.filter((e) => e.event === 'tool_call');
    const toolResultEvents = events.filter((e) => e.event === 'tool_result');
    const textEvents = events.filter((e) => e.event === 'text');

    expect(toolCallEvents.length).toBe(1);
    expect((toolCallEvents[0].data as any).name).toBe('getRoute');
    expect(toolResultEvents.length).toBe(1);
    expect(textEvents.some((e) => (e.data as any).text.includes('North Concourse'))).toBe(true);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  test('handles Gemini API error gracefully', async () => {
    const mockGenerateContent = jest.fn().mockRejectedValue(new Error('API unavailable'));

    MockGoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: mockGenerateContent,
      }),
    } as any));

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    expect(res.status).toBe(200);
    const events = parseSSE(res.body as string);
    const errorEvents = events.filter((e) => e.event === 'error');
    expect(errorEvents.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  test('returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
