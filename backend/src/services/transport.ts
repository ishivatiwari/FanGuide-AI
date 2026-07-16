/**
 * FanGuide AI — Transport Options Service
 *
 * Recommends transit options and calculates "leave-by" times so fans
 * can catch kickoff or make their way home without missing connections.
 *
 * Buffer calculation: totalJourney = walkToHub + travelTime + buffer
 * The model uses this to say "Leave by 6:15 PM to arrive comfortably."
 */

import type { TransitRecommendation, TransitOption } from '../types/stadium';
import { getAllTransitOptions } from '../data/dataLoader';

// Buffer added on top of journey time to account for boarding etc. (minutes)
const BUFFER_MINUTES = 15;

/**
 * Returns the best transit options to a given destination,
 * with a "leave-by" time calculated from the kickoff offset.
 *
 * @param destination         Partial destination name (case-insensitive search)
 * @param kickoffOffsetMinutes Minutes until kickoff (negative = post-game)
 * @param currentTime         ISO timestamp of current time (defaults to now)
 * @returns                   Array of ranked TransitRecommendations
 */
export function getTransportOptions(
  destination: string,
  kickoffOffsetMinutes: number,
  currentTime?: string
): TransitRecommendation[] {
  const allOptions = getAllTransitOptions();
  const now = currentTime ? new Date(currentTime) : new Date();
  const recommendations: TransitRecommendation[] = [];

  for (const option of allOptions) {
    // Find destinations matching the query (fuzzy, case-insensitive)
    const matchingDest = option.destinations.find((d) =>
      d.name.toLowerCase().includes(destination.toLowerCase())
    );

    if (!matchingDest) continue;

    const totalJourney = matchingDest.walkToHubMinutes + matchingDest.travelMinutes + BUFFER_MINUTES;

    // Calculate leave-by time:
    // kickoffOffsetMinutes > 0 means "before kickoff" (pre-game arrival)
    // kickoffOffsetMinutes < 0 means "after kickoff" (post-game departure)
    const targetArrivalMs =
      now.getTime() + kickoffOffsetMinutes * 60 * 1000;
    const leaveByMs = targetArrivalMs - totalJourney * 60 * 1000;
    const leaveByDate = new Date(leaveByMs);

    const leaveByTime = leaveByDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    recommendations.push({
      option,
      recommendedDestination: matchingDest,
      leaveByTime,
      totalJourneyMinutes: totalJourney,
      bufferMinutes: BUFFER_MINUTES,
    });
  }

  // Sort: accessible options first, then by total journey time (shortest first)
  recommendations.sort((a, b) => {
    if (a.option.accessible && !b.option.accessible) return -1;
    if (!a.option.accessible && b.option.accessible) return 1;
    return a.totalJourneyMinutes - b.totalJourneyMinutes;
  });

  return recommendations;
}

/**
 * Returns all available transit options (for when destination is unspecified).
 */
export function getAllTransportOptions(): TransitOption[] {
  return getAllTransitOptions();
}
