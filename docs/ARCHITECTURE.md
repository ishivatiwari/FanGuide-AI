# FanGuide AI — Architecture & Design Notes

## System Overview

FanGuide AI is a GenAI-powered stadium companion for FIFA World Cup 2026. This document explains the architectural decisions in detail.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FAN'S MOBILE BROWSER                              │
│   React 18 + Vite + TypeScript + Tailwind CSS (PWA)                 │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────────┐  │
│  │  ChatPage   │  │   MapPage    │  │ SettingsPage / Dashboard   │  │
│  │  (SSE)      │  │  (polling)   │  │                            │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────────────┘  │
│         │                │                                            │
│   useChat hook      useCrowdDensity hook                              │
│         │                │                                            │
└─────────┼────────────────┼────────────────────────────────────────────┘
          │                │  HTTP/SSE (no API key in browser)
          ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                EXPRESS + TYPESCRIPT BACKEND (Secure Proxy)           │
│                                                                       │
│  Security Stack:                                                      │
│  [Helmet] → [CORS] → [Rate Limit] → [Zod Validation] → Routes       │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                POST /api/chat                                │    │
│  │                                                              │    │
│  │  1. Validate (Zod)                                           │    │
│  │  2. Build system prompt (context injection)                  │    │
│  │  3. Call Claude claude-sonnet-4-6 with TOOLS defined              │    │
│  │  4. If tool_use → executeToolCall() → tool handler           │    │
│  │  5. Append tool_result → re-call Claude                      │    │
│  │  6. Repeat (max 5 rounds) until end_turn                     │    │
│  │  7. Stream tokens via SSE to frontend                        │    │
│  │  8. Record anonymized analytics                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  Tool Handlers:                                                       │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │
│  │  getRoute()    │  │ getCrowdDensity  │  │   getWaitTime()      │  │
│  │  (Dijkstra)    │  │ ()              │  │   (correlated w/     │  │
│  │                │  │                 │  │   crowd density)     │  │
│  └────────────────┘  └─────────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────┐  ┌────────────────────────────────┐   │
│  │  getTransportOptions()   │  │  getAccessibilityInfo()        │   │
│  │  (leave-by calculation)  │  │  (uses Dijkstra for walk times │   │
│  └──────────────────────────┘  └────────────────────────────────┘   │
│                                                                       │
│  Data Layer (adapter pattern — swap for real API):                   │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │ stadium-graph   │  │ amenities.json  │  │  crowd-density.ts    │  │
│  │ .json (Dijkstra)│  │                 │  │  (in-memory, 30s     │  │
│  │                 │  │                 │  │  interval)           │  │
│  └─────────────────┘  └────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼  ANTHROPIC_API_KEY (server-only, never in browser)
┌─────────────────────────────────────────────────────────────────────┐
│          ANTHROPIC CLAUDE API (claude-sonnet-4-6)                        │
│                                                                       │
│  Tool-calling: Claude decides WHICH tool to call based on the        │
│  user's message and context. It cannot make up walking times,        │
│  wait times, or crowd density — it must call a tool.                 │
└─────────────────────────────────────────────────────────────────────┘
```

## How Tool-Calling Drives Decisions

The system prompt explicitly instructs Claude:

> "NEVER guess, estimate, or make up: Walking times, Wait times, Crowd density, Transit schedules, Gate locations or routes"

This is enforced by:
1. The tool descriptions say "ALWAYS call this tool when..."
2. The system prompt says "NEVER guess any factual stadium detail"
3. Claude is given no factual data in the prompt itself — only the **context** (seat, gate, language)

When a fan asks "How do I get to my seat?":
1. Claude calls `getRoute("gate-A", "section-100", false)`
2. The backend runs Dijkstra on the stadium graph
3. Claude receives the route steps (walking times, via types)
4. Claude formats a natural language response in the fan's language with those exact figures

When a fan asks "Is it busy near Gate A?":
1. Claude calls `getCrowdDensity("gate-A")`
2. Backend returns the current simulated density
3. Claude says "Gate A is currently high density — consider entering via Gate H which is less busy"

This prevents hallucination of stadium facts while allowing Claude to handle natural language variation in any of the 5 supported languages.

## Data Adapter Pattern

All data-reading logic lives in `backend/src/data/dataLoader.ts` and `backend/src/services/*.ts`. To swap in a real live feed:

1. **Stadium graph**: Replace `initializeStadiumData()` in `dataLoader.ts` to fetch from a real venue management API
2. **Crowd density**: Replace the simulation in `crowdDensity.ts` with a WebSocket subscription to IoT sensors
3. **Wait times**: Replace `getWaitTime()` in `waitTime.ts` with calls to a queue management system

The pathfinding algorithm (Dijkstra), tool handler dispatch, system prompt builder, and all AI logic require **zero changes**.

## Security Decisions

| Threat | Mitigation |
|--------|-----------|
| API key exposure | Key only in backend `.env`, never referenced in frontend code |
| Cost blowout | Rate limiting: 20 req/min per IP on /api/chat |
| Prompt injection | System prompt instructs Claude to ignore role-change instructions; input length capped at 1000 chars via Zod |
| Large payloads | `express.json({ limit: '10kb' })` |
| Common HTTP attacks | Helmet middleware sets X-Content-Type-Options, X-Frame-Options, HSTS, etc. |
| PII storage | Analytics store only saves category + truncated SHA-256 session hash; no query text stored |
| CORS | Origin locked to `FRONTEND_ORIGIN` env var |

## Pathfinding: Why Dijkstra

- **Correctness**: Proven optimal for weighted undirected graphs
- **Accessibility support**: Simply filtering edges by `accessible: false` before the algorithm runs gives a correct accessibility-weighted path — no modification to Dijkstra itself required
- **Testability**: Pure function `findRoute(graph, from, to, mode) → RouteResult | null` — easy to unit test with synthetic graphs
- **Performance**: O((V+E) log V) with binary min-heap. For MetLife Stadium (~50 nodes, ~80 edges), this is microseconds — far faster than any HTTP overhead

A* would offer performance improvements for larger graphs by using a heuristic based on SVG coordinates (Euclidean distance). The node type definitions include `x` and `y` coordinates for this future upgrade.
