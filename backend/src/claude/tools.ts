/**
 * FanGuide AI — Gemini Tool Definitions
 *
 * Defines the tools exposed to Google Gemini via the function-calling API.
 * Each tool has a strict JSON schema so the model knows exactly what parameters
 * to send. This is the "logical decision making" layer: Gemini MUST call
 * a tool to get any factual stadium detail instead of guessing/hallucinating.
 *
 * Tool schemas follow the Gemini FunctionDeclaration format.
 */

import type { Tool } from '@google/generative-ai';

export const STADIUM_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'getRoute',
        description:
          'Finds the optimal walking route between two points in the stadium. ' +
          'ALWAYS call this tool when a fan asks for directions, navigation, ' +
          'how to find their seat, or the fastest path to any location. ' +
          'Do NOT guess walking times — use this tool.',
        parameters: {
          type: 'OBJECT' as any,
          properties: {
            from: {
              type: 'STRING' as any,
              description:
                'The starting node ID (e.g., "gate-A", "concourse-N", "section-100"). ' +
                "Use the fan's current gate or location from context.",
            },
            to: {
              type: 'STRING' as any,
              description:
                'The destination node ID. Choose the most appropriate node for what ' +
                'the fan is looking for (e.g., "restroom-N1" for a restroom, "section-100" for a seat section).',
            },
            accessibilityMode: {
              type: 'BOOLEAN' as any,
              description:
                'Set to true if the fan has mobility needs, uses a wheelchair, or has ' +
                'requested accessible routes. Accessible mode avoids stairs and prefers ramps/lifts.',
            },
          },
          required: ['from', 'to', 'accessibilityMode'],
        },
      },
      {
        name: 'getCrowdDensity',
        description:
          'Returns the current crowd density (low/medium/high) for a specific zone. ' +
          'ALWAYS call this when suggesting a route so you can warn about congested areas ' +
          'or recommend an alternate path. Do NOT guess crowd conditions.',
        parameters: {
          type: 'OBJECT' as any,
          properties: {
            zone: {
              type: 'STRING' as any,
              description:
                'The zone/node ID to check crowd density for (e.g., "concourse-N", "gate-A", "transit-N").',
            },
          },
          required: ['zone'],
        },
      },
      {
        name: 'getWaitTime',
        description:
          'Returns the estimated queue wait time at a specific amenity (restroom, food court, merchandise). ' +
          'ALWAYS call this when a fan asks about queues, wait times, or how busy something is. ' +
          'Do NOT estimate wait times without calling this tool.',
        parameters: {
          type: 'OBJECT' as any,
          properties: {
            amenityId: {
              type: 'STRING' as any,
              description:
                'The amenity ID to check (e.g., "restroom-N1", "food-W1", "merch-N1").',
            },
          },
          required: ['amenityId'],
        },
      },
      {
        name: 'getTransportOptions',
        description:
          'Returns transit options (rail, shuttle, bus, rideshare) from the stadium to a destination, ' +
          'with a calculated "leave by" time based on the kickoff offset. ' +
          'ALWAYS call this when a fan asks about getting home, transit, parking, shuttles, or trains. ' +
          'Do NOT guess travel times or schedules.',
        parameters: {
          type: 'OBJECT' as any,
          properties: {
            destination: {
              type: 'STRING' as any,
              description:
                'The destination name or partial name (e.g., "NYC", "Penn Station", "Newark", "Times Square"). ' +
                'Case-insensitive search will be performed.',
            },
            kickoffOffsetMinutes: {
              type: 'NUMBER' as any,
              description:
                'Minutes until kickoff. Use positive values before the game (e.g., 30 = 30 min to kickoff). ' +
                'Use negative values post-game (e.g., -30 = 30 min after final whistle). ' +
                'Use 0 if the match is currently underway.',
            },
          },
          required: ['destination', 'kickoffOffsetMinutes'],
        },
      },
      {
        name: 'getAccessibilityInfo',
        description:
          'Returns comprehensive accessibility information for a specific gate: nearest accessible restroom, ' +
          'nearest lift/elevator, quiet room location, ASL sign-language help points, and wheelchair route details. ' +
          'ALWAYS call this when a fan mentions disability, wheelchair, accessibility needs, sensory sensitivity, ' +
          'hearing impairment, or asks about accessible facilities.',
        parameters: {
          type: 'OBJECT' as any,
          properties: {
            gateId: {
              type: 'STRING' as any,
              description:
                'The gate ID nearest to the fan (e.g., "gate-A" through "gate-H"). ' +
                'Use the gate from the session context if available.',
            },
          },
          required: ['gateId'],
        },
      },
    ],
  },
];
