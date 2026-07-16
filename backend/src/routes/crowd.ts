/**
 * FanGuide AI — Crowd Density Route (GET /api/crowd)
 *
 * Serves current crowd density data to the frontend for the
 * stadium map visualization. Returns either all zones or a
 * specific zone depending on query parameters.
 *
 * This endpoint is rate-limited separately from the chat endpoint
 * since it's polled on an interval by the frontend.
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getAllCrowdDensity, getCrowdDensityForZone } from '../services/crowdDensity';
import { CrowdZoneSchema } from '../validation/schemas';

export const crowdRouter = Router();

// Lighter rate limit for the polling endpoint (60 req/min)
const crowdRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
});

crowdRouter.use(crowdRateLimiter);

/** GET /api/crowd — returns all zones or a specific zone */
crowdRouter.get('/', (req: Request, res: Response): void => {
  const parseResult = CrowdZoneSchema.safeParse(req.query);

  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid query parameters' });
    return;
  }

  const { zoneId } = parseResult.data;

  if (zoneId) {
    const zone = getCrowdDensityForZone(zoneId);
    if (!zone) {
      res.status(404).json({ error: `Zone "${zoneId}" not found` });
      return;
    }
    res.json(zone);
  } else {
    res.json(getAllCrowdDensity());
  }
});
