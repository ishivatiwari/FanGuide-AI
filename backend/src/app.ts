/**
 * FanGuide AI — Express Application Factory
 *
 * Separates app creation from server startup so tests can import
 * `createApp()` without binding a port (supertest pattern).
 *
 * Security layers applied here (in order):
 *   1. Helmet   — HTTP header hardening
 *   2. CORS     — locked to FRONTEND_ORIGIN env var
 *   3. Morgan   — request logging (dev only)
 *   4. JSON body parsing (size-limited)
 *   5. Rate limiting — applied per-route in routers
 *   6. Routes
 *   7. Global error handler
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';

import { chatRouter } from './routes/chat';
import { crowdRouter } from './routes/crowd';
import { dashboardRouter } from './routes/dashboard';

export function createApp(): Application {
  const app = express();

  // ── 1. Helmet — sets secure HTTP headers ──────────────────────────────────
  // Includes: X-Content-Type-Options, X-Frame-Options, HSTS, etc.
  app.use(
    helmet({
      // Allow SSE from our own origin (Content-Security-Policy adjustment)
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    })
  );

  // ── 2. CORS — locked to frontend origin ───────────────────────────────────
  const allowedOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  app.use(
    cors({
      origin: allowedOrigin,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false, // No cookies in this stateless API
    })
  );

  // ── 3. Request logging (dev only — never logs PII) ────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    // 'tiny' format logs method + path + status — no request bodies
    app.use(morgan('tiny'));
  }

  // ── 4. Compression + body parsing ─────────────────────────────────────────
  app.use(compression());
  app.use(express.json({ limit: '10kb' })); // Limit payload to prevent abuse

  // ── 5. Health check (unauthenticated, no rate limit) ──────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── 6. API Routes ──────────────────────────────────────────────────────────
  app.use('/api/chat', chatRouter);
  app.use('/api/crowd', crowdRouter);
  app.use('/api/dashboard', dashboardRouter);

  // ── 7. 404 handler ────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ── 8. Global error handler ───────────────────────────────────────────────
  // Express requires 4-param signature to recognize as error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // Log server-side but never expose stack traces to clients
    console.error('[error]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
