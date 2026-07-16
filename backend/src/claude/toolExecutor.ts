/**
 * FanGuide AI — Tool Executor
 *
 * Dispatches Gemini function-calling invocations to their corresponding
 * handler functions. This is the bridge between the AI's decisions and
 * real stadium data.
 *
 * When Gemini decides to call a function (e.g., getRoute), it returns a
 * functionCall part. This module:
 *   1. Validates the tool name and inputs
 *   2. Calls the appropriate service function
 *   3. Returns the result as a plain object for Gemini to read
 *
 * The separation between tool definitions (tools.ts) and execution
 * (this file) makes each handler independently unit-testable.
 */

import { findRoute } from '../pathfinding/dijkstra';
import { getStadiumGraph } from '../data/dataLoader';
import { getCrowdDensityForZone } from '../services/crowdDensity';
import { getWaitTime } from '../services/waitTime';
import { getTransportOptions } from '../services/transport';
import { getAccessibilityInfo } from '../services/accessibility';

/**
 * Executes a tool call by name and returns the result as a plain object.
 * Throws if the tool throws an unexpected error (caller handles this).
 */
export async function executeToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'getRoute': {
      const { from, to, accessibilityMode } = input as {
        from: string;
        to: string;
        accessibilityMode: boolean;
      };
      const graph = getStadiumGraph();
      const route = findRoute(graph, from, to, accessibilityMode);

      if (!route) {
        return {
          error: accessibilityMode
            ? `No accessible route found from ${from} to ${to}. ` +
              `This may mean the destination is only reachable via stairs. ` +
              `Please ask a steward for manual assistance.`
            : `No route found from ${from} to ${to}.`,
        };
      }
      return route;
    }

    case 'getCrowdDensity': {
      const { zone } = input as { zone: string };
      const density = getCrowdDensityForZone(zone);

      if (!density) {
        return { error: `No crowd density data found for zone: ${zone}` };
      }
      return density;
    }

    case 'getWaitTime': {
      const { amenityId } = input as { amenityId: string };
      const waitTime = getWaitTime(amenityId);

      if (!waitTime) {
        return { error: `Amenity not found: ${amenityId}` };
      }
      return waitTime;
    }

    case 'getTransportOptions': {
      const { destination, kickoffOffsetMinutes } = input as {
        destination: string;
        kickoffOffsetMinutes: number;
      };
      const options = getTransportOptions(destination, kickoffOffsetMinutes);

      if (options.length === 0) {
        return {
          message:
            `No direct transit options found to "${destination}". ` +
            `Please visit the North or South Transit Hub for full departure information.`,
          availableHubs: ['transit-N (North Hub)', 'transit-S (South Hub)', 'transit-E (East Rideshare)'],
        };
      }
      return { options: options.slice(0, 3) }; // Top 3 options
    }

    case 'getAccessibilityInfo': {
      const { gateId } = input as { gateId: string };
      const info = getAccessibilityInfo(gateId);

      if (!info) {
        return {
          error:
            `No accessibility info found for gate: ${gateId}. ` +
            `Please ask any steward for assistance.`,
        };
      }
      return info;
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
