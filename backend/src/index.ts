/**
 * FanGuide AI — Backend Entry Point
 *
 * Bootstraps the Express server, applies all security middleware,
 * mounts API routers, and starts listening. The Gemini API key
 * is loaded here from the environment and NEVER passed to the client.
 */

import 'dotenv/config';
import { createApp } from './app';
import { initializeStadiumData } from './data/dataLoader';
import { startCrowdDensitySimulation } from './services/crowdDensity';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main(): Promise<void> {
  // ── 1. Validate required environment variables ──────────────────────────────
  if (!process.env.GEMINI_API_KEY) {
    console.error(
      '[FATAL] GEMINI_API_KEY is not set. ' +
        'Copy .env.example to .env and add your Google Gemini API key. The server will not start.'
    );
    process.exit(1);
  }

  // ── 2. Load and cache static stadium data in memory ─────────────────────────
  // This avoids re-parsing JSON on every request (efficiency requirement).
  console.log('[startup] Loading stadium data into memory cache...');
  initializeStadiumData();
  console.log('[startup] Stadium data loaded.');

  // ── 3. Start the crowd-density simulation loop ───────────────────────────────
  // In production, replace this with a real IoT feed subscription.
  const refreshInterval = parseInt(
    process.env.CROWD_REFRESH_INTERVAL_MS ?? '30000',
    10
  );
  startCrowdDensitySimulation(refreshInterval);
  console.log(
    `[startup] Crowd density simulation started (interval: ${refreshInterval}ms).`
  );

  // ── 4. Create and start Express app ─────────────────────────────────────────
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[startup] FanGuide AI backend running on http://localhost:${PORT}`);
    console.log(`[startup] Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

main().catch((err) => {
  console.error('[FATAL] Unhandled startup error:', err);
  process.exit(1);
});
