/**
 * FanGuide AI — Accessibility Info Service
 *
 * Provides comprehensive accessibility information for each gate:
 *   - Nearest accessible restroom (with walking time)
 *   - Nearest lift/elevator
 *   - Quiet room / sensory zone
 *   - ASL (sign language) help point
 *   - Wheelchair route summary
 *   - Sensory-friendly zones list
 *
 * Uses the pathfinding layer to compute accurate walking times
 * rather than hardcoding approximate distances.
 */

import type { AccessibilityInfo } from '../types/stadium';
import { getStadiumGraph, getAllAmenities } from '../data/dataLoader';
import { findRoute } from '../pathfinding/dijkstra';

/**
 * Returns accessibility information for a given gate.
 *
 * @param gateId  The gate node ID (e.g., "gate-A")
 * @returns       AccessibilityInfo object, or null if gate not found
 */
export function getAccessibilityInfo(gateId: string): AccessibilityInfo | null {
  const graph = getStadiumGraph();
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const gateNode = nodeMap.get(gateId);

  if (!gateNode) return null;

  const amenities = getAllAmenities();

  // Helper: find nearest amenity of a given type using accessible pathfinding
  function findNearest(
    type: string
  ): { id: string; label: string; walkMinutes: number } | null {
    let bestResult: { id: string; label: string; walkMinutes: number } | null = null;
    let bestSeconds = Infinity;

    for (const amenity of amenities) {
      if (amenity.type !== type) continue;
      if (!amenity.accessible) continue;

      try {
        // Use accessibility mode (true) to avoid stairs
        const route = findRoute(graph, gateId, amenity.nodeId, true);
        if (route && route.totalDurationSeconds < bestSeconds) {
          bestSeconds = route.totalDurationSeconds;
          bestResult = {
            id: amenity.id,
            label: amenity.name,
            walkMinutes: Math.round(route.totalDurationSeconds / 60),
          };
        }
      } catch {
        // Node might not be reachable; skip silently
      }
    }

    return bestResult;
  }

  // Also check lift nodes using graph nodes directly
  function findNearestLift(): { id: string; label: string; walkMinutes: number } | null {
    let bestResult: { id: string; label: string; walkMinutes: number } | null = null;
    let bestSeconds = Infinity;

    for (const node of graph.nodes) {
      if (node.type !== 'lift') continue;
      try {
        const route = findRoute(graph, gateId, node.id, true);
        if (route && route.totalDurationSeconds < bestSeconds) {
          bestSeconds = route.totalDurationSeconds;
          bestResult = {
            id: node.id,
            label: node.label,
            walkMinutes: Math.round(route.totalDurationSeconds / 60),
          };
        }
      } catch {
        // skip
      }
    }
    return bestResult;
  }

  const nearestRestroom = findNearest('restroom');
  const nearestLift = findNearestLift();
  const quietRoom = findNearest('accessibility');
  const aslHelpPoint = findNearest('accessibility');

  // Derive sensory-friendly zones
  const sensoryZones = amenities
    .filter(
      (a) =>
        a.type === 'accessibility' &&
        a.features?.some((f) => ['low-light', 'quiet', 'sensory-toys', 'calming-space'].includes(f))
    )
    .map((a) => a.name);

  // Build wheelchair route description from gate
  const wheelchairRoute = buildWheelchairRouteNote(gateId);

  return {
    gateId,
    gateLabel: gateNode.label,
    nearestAccessibleRestroom: nearestRestroom,
    nearestLift,
    quietRoom,
    aslHelpPoint,
    wheelchairRoute,
    sensoryFriendlyZones: sensoryZones,
    notes: `All lifts at MetLife Stadium serve all levels (0–2). Accessible routes are marked with the international wheelchair symbol. Contact any steward or call 1-800-STADIUM for immediate mobility assistance.`,
  };
}

function buildWheelchairRouteNote(gateId: string): string {
  const gateNotes: Record<string, string> = {
    'gate-A': 'Enter via ramp on the right side of Gate A. Proceed to North Concourse level 1. Lifts to upper levels are 45 seconds left of the main concourse.',
    'gate-B': 'Enter via ramp at Gate B. Take the North-East lift (lift-NE) for upper level access.',
    'gate-C': 'Gate C has a dedicated accessible entrance on the south side. East concourse is fully flat.',
    'gate-D': 'Enter via accessible ramp at Gate D south entrance. Lift-SE is immediately inside.',
    'gate-E': 'Gate E has a level entry. South concourse is step-free throughout.',
    'gate-F': 'Gate F accessible entry is on the west side. Lift-SW is 2 minutes from the entrance.',
    'gate-G': 'Gate G is the primary accessible entry for West concourse. Lifts and ramps throughout.',
    'gate-H': 'Gate H — use the north ramp entry. North-West lift (lift-NW) is 45 seconds walk inside.',
  };

  return gateNotes[gateId] ?? 'Please ask any steward for accessible entry directions at this gate.';
}
