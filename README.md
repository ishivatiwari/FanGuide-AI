# ⚽ FanGuide AI — FIFA World Cup 2026 Stadium Companion

> **Hackathon Project** | FIFA World Cup 2026 | Built with Google Gemini + React + Node.js

FanGuide AI is a GenAI-powered, mobile-first PWA that helps fans navigate MetLife Stadium during FIFA World Cup 2026. It answers questions in 5 languages, routes fans with accessibility awareness, shows live crowd density, and gives staff a real-time operational dashboard — all powered by Claude's tool-calling API running entirely on the server.

---

## 📌 1. Chosen Vertical

**Fan Experience: Navigation + Accessibility + Multilingual Assistance + Crowd Management**

**Why this vertical?** Navigation is the #1 friction point for international fans at a foreign stadium in a foreign country. By combining:
- **Wayfinding** (step-by-step directions to any seat, amenity, or exit)
- **Accessibility** (wheelchair-safe routes, lift locations, quiet rooms, ASL help)
- **Multilingual** (English, Spanish, French, Portuguese, Arabic with RTL)
- **Crowd intelligence** (real-time density to suggest less-crowded routes)
- **Staff tools** (anonymized aggregated dashboard for operational decisions)

…we address the most urgent and universal pain points for the estimated 4 million fans across 16 host cities.

---

## 🏗️ 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FAN'S MOBILE BROWSER (PWA)                        │
│   React 18 + Vite + TypeScript + Tailwind CSS                        │
│   ChatPage (SSE) | MapPage (polling) | Settings | Dashboard          │
└─────────────────────────────────────────────────────────────────────┘
          │  HTTP/SSE (no API key ever in browser)
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│        EXPRESS + TYPESCRIPT BACKEND (Secure Proxy)                   │
│  [Helmet] → [CORS] → [Rate Limit] → [Zod Validation] → Routes       │
│                                                                       │
│  POST /api/chat — Agentic loop (up to 5 rounds):                     │
│    Validate → System Prompt → Claude API → Tool Calls → SSE Stream  │
│                                                                       │
│  Tool Handlers:                                                       │
│    getRoute()           — Dijkstra over stadium graph                 │
│    getCrowdDensity()    — Live zone congestion                        │
│    getWaitTime()        — Queue estimation per amenity                │
│    getTransportOptions() — Leave-by time calculation                  │
│    getAccessibilityInfo() — Lifts, ramps, quiet rooms, ASL           │
│                                                                       │
│  Data Layer (adapter pattern):                                        │
│    stadium-graph.json | amenities.json | transit.json | crowd state  │
└─────────────────────────────────────────────────────────────────────┘
          │  ANTHROPIC_API_KEY (server-only)
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│          GOOGLE GEMINI API (gemini-2.0-flash)                              │
│  Tool-calling: Gemini MUST call a tool to get any factual stadium    │
│  data — it cannot hallucinate walking times, crowd levels, etc.      │
└─────────────────────────────────────────────────────────────────────┘
```

### How Tool-Calling Drives Contextual Decisions

The system prompt explicitly forbids Gemini from guessing stadium facts. When a fan asks "Is it busy near Gate A?":
1. Gemini calls `getCrowdDensity("gate-A")` → backend returns `{ density: "high", estimatedOccupancy: 72 }`
2. Gemini sees high density and *also* calls `getRoute("gate-A", "gate-H", false)` to propose an alternative entry
3. Gemini responds: *"Gate A is very busy right now. You could enter via Gate H instead — about 2 minutes walk further but currently low density."*

This is grounded, factual reasoning from real (simulated) data — not hallucination.

---

## 🎯 3. User Journeys

### Fan Journey

1. **Opens app** → Chat welcome screen with quick-action chips
2. **Sets context** (Settings → seat, gate, language, accessibility needs)
3. **Asks**: "Where is my seat?" → Gemini calls `getRoute`, renders step-by-step route card
4. **Asks**: "Is the north restroom busy?" → Gemini calls `getCrowdDensity` + `getWaitTime`, renders density badge + wait time
5. **Asks**: "How do I get home to NYC after the match?" → Gemini calls `getTransportOptions(-60)`, renders transit card with "Leave by 6:30 PM"
6. **Views Map** → SVG stadium map with live density coloring per zone, auto-updates every 30s
7. **Accessibility user**: App detects wheelchair need, Gemini always uses `accessibilityMode: true`, avoids stairs

### Volunteer/Staff Journey

1. **Taps Dashboard tab** → Staff mode gate (demo toggle; production uses SSO)
2. **Sees**: Urgent alerts (accessibility emergencies in last 30 min)
3. **Sees**: Query category breakdown — "Navigation 42%, Food 22%, Restroom 18%..." → helps direct volunteer positions
4. **Sees**: Live crowd density heatmap across all gates and concourses → dispatch staff to high-density zones
5. **Auto-refreshes** every 15 seconds without any action

---

## ⚙️ 4. Setup Instructions

### Prerequisites
- Node.js 20+
- An [Gemini API key](https://aistudio.google.com/apikey)

### Backend Setup

```bash
cd backend
npm install

# Create .env from template
cp ../.env.example .env
# Edit .env and add your GEMINI_API_KEY

npm run dev
# Backend starts on http://localhost:3001
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Frontend starts on http://localhost:5173
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Your Google Gemini API key (server-only) |
| `PORT` | No | `3001` | Backend server port |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | CORS allowed origin |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `20` | Max requests per window per IP |
| `CROWD_REFRESH_INTERVAL_MS` | No | `30000` | Crowd density refresh interval |
| `STAFF_TOKEN` | No | (open) | Bearer token for dashboard (omit for demo) |

---

## 🧪 5. Running Tests

### Backend Tests (Jest)

```bash
cd backend
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm run test:coverage # Coverage report
```

**What's covered:**
- `tests/pathfinding.test.ts` — Dijkstra: shortest path, accessibility mode (stairs excluded), disconnected graphs, same-node, optimality
- `tests/toolExecutor.test.ts` — All 5 tool handlers, error cases, unknown tools, exception handling
- `tests/validation.test.ts` — Zod schemas: message length, gate ID format, language allowlist, history limit
- `tests/chat.integration.test.ts` — Full chat endpoint: SSE streaming, tool-call loop, Gemini API error handling (Gemini SDK mocked)

### Frontend Tests (Vitest)

```bash
cd frontend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**What's covered:**
- `src/test/components.test.tsx` — RouteCard, WaitTimeBadge, TransitCard rendering, accessibility attributes, edge cases

---

## 🔒 6. Security Notes

| Measure | Implementation |
|---|---|
| **API key isolation** | `GEMINI_API_KEY` only in `backend/.env`, loaded by `dotenv`, never referenced in frontend code |
| **CORS lockdown** | `cors({ origin: process.env.FRONTEND_ORIGIN })` — rejects requests from any other origin |
| **Rate limiting** | `express-rate-limit` — 20 requests/min per IP on `/api/chat`, 60/min on `/api/crowd` |
| **Input validation** | `zod` schemas on every POST route before any processing or Gemini calls |
| **HTTP hardening** | `helmet` middleware sets X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, etc. |
| **Payload limit** | `express.json({ limit: '10kb' })` — prevents large payload attacks |
| **Prompt injection** | System instruction instructs Gemini to ignore role-change instructions; message capped at 1000 chars via Zod |
| **No PII storage** | Analytics store saves only: category, timestamp, urgency flag, 16-char SHA-256 truncated hash of session ID — no query text, no IP |
| **No cookies** | Stateless API, no session cookies, CORS `credentials: false` |

---

## ♿ 7. Accessibility Notes (WCAG 2.1 AA)

| WCAG Criterion | Implementation |
|---|---|
| **1.1.1 Non-text Content** | All icons have `aria-hidden="true"` with adjacent text labels; SVG map zones have `<title>` elements |
| **1.3.1 Info and Relationships** | Semantic HTML: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<ol>`, `<time>` throughout |
| **1.4.3 Contrast** | Color palette designed with 4.5:1+ contrast ratio (navy bg / white text; gold / dark bg) |
| **1.4.4 Resize Text** | Font size adjustable in Settings (4 levels); uses CSS custom property `--font-size-base` |
| **1.4.10 Reflow** | Mobile-first Tailwind layout; content reflows without horizontal scroll at 320px |
| **1.4.12 Text Spacing** | No hard-coded line heights; uses Tailwind's fluid `leading-relaxed` |
| **2.1.1 Keyboard** | All interactive elements (buttons, links, selects, SVG zones) reachable via Tab; Enter/Space activate |
| **2.4.1 Bypass Blocks** | Skip-to-content link (`<a href="#main-content">`) at top of every page |
| **2.4.3 Focus Order** | DOM order matches visual order; no positive `tabindex` values |
| **2.4.7 Focus Visible** | `*:focus-visible` — 3px gold (#ffc80a) outline on keyboard focus for all elements |
| **3.1.1 Language of Page** | `<html lang>` updated dynamically via `applyLanguageDirection()` on language change |
| **3.1.2 Language of Parts** | AI responses are in the user's selected language (enforced in system prompt) |
| **4.1.2 Name, Role, Value** | ARIA `role`, `aria-label`, `aria-pressed`, `aria-checked`, `aria-current`, `aria-live` used throughout |
| **4.1.3 Status Messages** | `aria-live="polite"` on message list; `role="status"` on wait time badge; `role="alert"` on urgent messages |

**Verifying WCAG compliance:**
- Run [axe DevTools](https://www.deque.com/axe/) browser extension on each page
- Use keyboard-only navigation (Tab, Shift+Tab, Enter, Space)
- Enable macOS VoiceOver or Windows Narrator and navigate by landmark headings
- Set OS high-contrast mode and verify the `.high-contrast` CSS class activates

**In-venue accessibility features:**
- AI always uses accessibility-weighted routes for users with declared mobility needs
- Accessible restroom, lift, quiet room, and ASL help point locations surfaced via `getAccessibilityInfo` tool
- Settings panel lets users declare needs once; these persist across sessions and are sent with every AI request

---

## 📋 8. Assumptions

| Assumption | Rationale |
|---|---|
| Stadium is MetLife Stadium (NJ) | FIFA 2026 confirmed host venue; fictional but realistic layout |
| Crowd density and wait times are **simulated** | No live IoT stadium feed available; adapter layer is built so a real feed only requires changes to `crowdDensity.ts` and `waitTime.ts`, not AI logic |
| Staff dashboard "auth" is a demo toggle | Production would use OAuth/SSO (e.g., Google Workspace for FIFA staff); clearly documented |
| No user accounts | Session ID generated fresh each visit; no login required (fan privacy) |
| Transit schedules are approximate | Based on real NJ Transit Meadowlands patterns but not live data |
| Arabic RTL covers layout flip | Font (Inter) supports Arabic; full RTL tested via `dir="rtl"` on `<html>` |
| Claude responds natively in selected language | No separate translation API call needed; system prompt enforces language |
| PWA requires HTTPS in production | Works on `localhost` for demo; requires valid SSL cert for installation in production |

---

## 🛠️ Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, react-i18next |
| Backend | Node.js 20, Express, TypeScript, Anthropic SDK |
| AI | Google Gemini (gemini-2.0-flash, server-side only, function-calling) |
| Pathfinding | Custom Dijkstra with binary min-heap (TypeScript) |
| Security | Helmet, express-rate-limit, Zod, CORS |
| Testing | Jest (backend), Vitest + React Testing Library (frontend) |
| PWA | vite-plugin-pwa (Workbox) |
| CI/CD | GitHub Actions |

---

## 📁 Project Structure

```
FanGuide AI/
├── .env.example               # Environment template (copy to .env)
├── .gitignore
├── README.md
├── .github/
│   └── workflows/ci.yml       # Lint + test on push
│
├── backend/
│   ├── src/
│   │   ├── index.ts           # Server startup (validates env, caches data)
│   │   ├── app.ts             # Express app factory (security middleware)
│   │   ├── claude/
│   │   │   ├── tools.ts       # Tool definitions (JSON Schema)
│   │   │   ├── toolExecutor.ts # Tool dispatch → handler functions
│   │   │   └── systemPrompt.ts # Prompt builder (context injection)
│   │   ├── data/
│   │   │   └── dataLoader.ts  # Stadium data cache (adapter layer)
│   │   ├── pathfinding/
│   │   │   └── dijkstra.ts    # Pathfinding algorithm
│   │   ├── routes/
│   │   │   ├── chat.ts        # POST /api/chat (SSE + tool loop)
│   │   │   ├── crowd.ts       # GET /api/crowd
│   │   │   └── dashboard.ts   # GET /api/dashboard (staff)
│   │   ├── services/
│   │   │   ├── crowdDensity.ts # Simulation (adapter for real IoT)
│   │   │   ├── waitTime.ts    # Wait time estimation
│   │   │   ├── transport.ts   # Transit + leave-by calculation
│   │   │   ├── accessibility.ts # Accessible facility finder
│   │   │   └── analytics.ts   # Anonymized query store (SHA-256)
│   │   ├── types/
│   │   │   └── stadium.ts     # All domain types
│   │   └── validation/
│   │       └── schemas.ts     # Zod schemas for all endpoints
│   ├── tests/
│   │   ├── pathfinding.test.ts
│   │   ├── toolExecutor.test.ts
│   │   ├── validation.test.ts
│   │   └── chat.integration.test.ts
│   └── data/
│       ├── stadium-graph.json  # Node/edge graph (SIMULATED)
│       ├── amenities.json      # Amenity details (SIMULATED)
│       └── transit.json        # Transit schedules (SIMULATED)
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx           # React entry point
│   │   ├── App.tsx            # Router + layout
│   │   ├── index.css          # Global styles + design tokens
│   │   ├── components/
│   │   │   ├── layout/Layout.tsx  # Shell, nav, language switcher
│   │   │   └── chat/
│   │   │       ├── ChatMessage.tsx    # Message bubble + TTS
│   │   │       ├── RouteCard.tsx      # Directions card
│   │   │       ├── WaitTimeBadge.tsx  # Queue indicator
│   │   │       ├── TransitCard.tsx    # Transit options
│   │   │       └── ToolResultRenderer.tsx # Tool → card dispatch
│   │   ├── context/
│   │   │   └── AppContext.tsx  # Settings + session state
│   │   ├── hooks/
│   │   │   ├── useChat.ts     # SSE streaming + message state
│   │   │   └── useCrowdDensity.ts # Polling with visibility API
│   │   ├── i18n/
│   │   │   ├── index.ts       # i18next setup + RTL direction
│   │   │   └── locales/       # en, es, fr, pt, ar translations
│   │   ├── pages/
│   │   │   ├── ChatPage.tsx   # Main chat UI
│   │   │   ├── MapPage.tsx    # SVG stadium map
│   │   │   ├── SettingsPage.tsx # Accessibility + language settings
│   │   │   └── DashboardPage.tsx # Staff view
│   │   ├── types/index.ts     # Frontend TypeScript types
│   │   └── test/
│   │       ├── setup.ts
│   │       └── components.test.tsx
│   └── vite.config.ts
│
└── docs/
    └── ARCHITECTURE.md        # Detailed design notes
```

---

## 🤝 Contributing

This is a hackathon project. See the architecture diagram in `docs/ARCHITECTURE.md` for extension points.
