/**
 * FanGuide AI — Wait Time Simulation Service
 *
 * Provides simulated queue wait times for stadium amenities (restrooms,
 * food courts, merchandise). In production, replace with a real sensor
 * feed or queue management API via the adapter pattern.
 *
 * Wait times are refreshed alongside crowd density (every 30s by default)
 * and are correlated with zone density — busier zones have longer queues.
 */

import type { WaitTimeResult } from '../types/stadium';
import { getCrowdDensityForZone } from './crowdDensity';
import { getAmenityById } from '../data/dataLoader';

/**
 * Returns a simulated wait time for a given amenity.
 * Wait times are influenced by the crowd density in the amenity's zone.
 *
 * @param amenityId  The amenity's ID (e.g., "restroom-N1")
 * @returns          WaitTimeResult, or null if amenity not found
 */
export function getWaitTime(amenityId: string): WaitTimeResult | null {
  const amenity = getAmenityById(amenityId);
  if (!amenity) return null;

  // Look up crowd density in the node's zone — use the node's parent zone
  // as a proxy (e.g., restroom-N1 → concourse-N zone)
  const zoneId = getZoneForNode(amenityId);
  const density = getCrowdDensityForZone(zoneId);

  // Base wait times by density level (minutes)
  let baseMin = 0;
  let baseMax = 3;

  if (density) {
    switch (density.density) {
      case 'high':
        baseMin = 8;
        baseMax = 20;
        break;
      case 'medium':
        baseMin = 3;
        baseMax = 8;
        break;
      case 'low':
      default:
        baseMin = 0;
        baseMax = 3;
        break;
    }
  }

  const estimatedWaitMinutes = Math.floor(
    Math.random() * (baseMax - baseMin + 1) + baseMin
  );

  let queueLength: WaitTimeResult['queueLength'];
  if (estimatedWaitMinutes === 0) queueLength = 'none';
  else if (estimatedWaitMinutes <= 4) queueLength = 'short';
  else if (estimatedWaitMinutes <= 10) queueLength = 'moderate';
  else queueLength = 'long';

  return {
    amenityId,
    amenityName: amenity.name,
    estimatedWaitMinutes,
    queueLength,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Maps an amenity/node ID to its parent zone ID for density lookup.
 * This is a simplified heuristic — a real system would use spatial indexing.
 */
function getZoneForNode(nodeId: string): string {
  if (nodeId.includes('-N')) return 'concourse-N';
  if (nodeId.includes('-E')) return 'concourse-E';
  if (nodeId.includes('-S')) return 'concourse-S';
  if (nodeId.includes('-W')) return 'concourse-W';
  return 'concourse-N'; // fallback
}
