/**
 * FanGuide AI — Staff Dashboard Route (GET /api/dashboard)
 *
 * Returns anonymized, aggregated data for the volunteer/staff view:
 *   - Query category counts
 *   - Urgent/flagged queries (last 30 min)
 *   - Current crowd density across all zones
 *   - Total queries in last 5 minutes
 *
 * AUTH NOTE: In this demo, "auth" is a simple bearer token check.
 * In production, replace with OAuth/SSO (e.g., Google Workspace).
 *
 * PRIVACY: No PII is ever returned. Query records contain only
 * category, timestamp, urgency flag, and a truncated session hash.
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getDashboardData } from '../services/analytics';

export const dashboardRouter = Router();

const dashboardRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
});

dashboardRouter.use(dashboardRateLimiter);

/**
 * Simple demo auth middleware.
 * In production: validate a JWT/session token from an SSO provider.
 * The STAFF_TOKEN env var should be a long random string in .env.
 */
function requireStaffAuth(req: Request, res: Response, next: () => void): void {
  const staffToken = process.env.STAFF_TOKEN;

  // If no STAFF_TOKEN configured, allow all (demo mode)
  if (!staffToken) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${staffToken}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

/** GET /api/dashboard */
dashboardRouter.get('/', requireStaffAuth, (_req: Request, res: Response): void => {
  const data = getDashboardData();
  res.json(data);
});
