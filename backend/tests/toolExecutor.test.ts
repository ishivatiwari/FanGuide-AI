/**
 * FanGuide AI — Unit Tests: Tool Handlers
 *
 * Tests the tool executor's dispatch logic with mocked services.
 * Verifies that:
 *   1. getRoute tool calls findRoute with correct parameters
 *   2. getCrowdDensity returns zone data or handles missing zones
 *   3. getWaitTime returns amenity data or handles unknown amenities
 *   4. getTransportOptions searches destinations and calculates leave-by time
 *   5. getAccessibilityInfo returns gate accessibility data
 *   6. Unknown tool names return a graceful error
 */

import { executeToolCall } from '../src/claude/toolExecutor';

// ── Mock all service modules ───────────────────────────────────────────────────
jest.mock('../src/pathfinding/dijkstra');
jest.mock('../src/data/dataLoader');
jest.mock('../src/services/crowdDensity');
jest.mock('../src/services/waitTime');
jest.mock('../src/services/transport');
jest.mock('../src/services/accessibility');

import { findRoute } from '../src/pathfinding/dijkstra';
import { getStadiumGraph } from '../src/data/dataLoader';
import { getCrowdDensityForZone } from '../src/services/crowdDensity';
import { getWaitTime } from '../src/services/waitTime';
import { getTransportOptions } from '../src/services/transport';
import { getAccessibilityInfo } from '../src/services/accessibility';

const mockFindRoute = findRoute as jest.MockedFunction<typeof findRoute>;
const mockGetGraph = getStadiumGraph as jest.MockedFunction<typeof getStadiumGraph>;
const mockGetCrowdDensity = getCrowdDensityForZone as jest.MockedFunction<typeof getCrowdDensityForZone>;
const mockGetWaitTime = getWaitTime as jest.MockedFunction<typeof getWaitTime>;
const mockGetTransportOptions = getTransportOptions as jest.MockedFunction<typeof getTransportOptions>;
const mockGetAccessibilityInfo = getAccessibilityInfo as jest.MockedFunction<typeof getAccessibilityInfo>;

const MOCK_GRAPH = { nodes: [], edges: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGraph.mockReturnValue(MOCK_GRAPH as any);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Tool Executor: getRoute', () => {
  test('calls findRoute with correct params and returns route result', async () => {
    const mockRoute = {
      from: 'gate-A',
      to: 'section-100',
      totalDurationSeconds: 120,
      steps: [
        { from: 'gate-A', to: 'concourse-N', fromLabel: 'Gate A', toLabel: 'North Concourse', durationSeconds: 60, via: 'ramp', accessible: true },
        { from: 'concourse-N', to: 'section-100', fromLabel: 'North Concourse', toLabel: 'Section 100', durationSeconds: 60, via: 'walkway', accessible: true },
      ],
      accessibilityMode: false,
      nodePath: ['gate-A', 'concourse-N', 'section-100'],
    };

    mockFindRoute.mockReturnValue(mockRoute);

    const result = await executeToolCall('getRoute', {
      from: 'gate-A',
      to: 'section-100',
      accessibilityMode: false,
    }) as any;

    expect(result.totalDurationSeconds).toBe(120);
    expect(result.nodePath).toEqual(['gate-A', 'concourse-N', 'section-100']);
    expect(mockFindRoute).toHaveBeenCalledWith(MOCK_GRAPH, 'gate-A', 'section-100', false);
  });

  test('returns error message when no route found (null from findRoute)', async () => {
    mockFindRoute.mockReturnValue(null);

    const result = await executeToolCall('getRoute', {
      from: 'gate-A',
      to: 'section-999',
      accessibilityMode: false,
    }) as any;

    expect(result.error).toContain('No route found');
  });

  test('accessibility mode: error message mentions stairs/steward', async () => {
    mockFindRoute.mockReturnValue(null);

    const result = await executeToolCall('getRoute', {
      from: 'gate-A',
      to: 'section-100',
      accessibilityMode: true,
    }) as any;

    expect(result.error).toContain('accessible route');
    expect(result.error).toContain('steward');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Tool Executor: getCrowdDensity', () => {
  test('returns zone density for a known zone', async () => {
    const mockDensity = {
      zoneId: 'concourse-N',
      zoneLabel: 'North Concourse',
      density: 'high' as const,
      estimatedOccupancy: 75,
      updatedAt: '2026-07-17T00:00:00Z',
    };
    mockGetCrowdDensity.mockReturnValue(mockDensity);

    const result = await executeToolCall('getCrowdDensity', { zone: 'concourse-N' }) as any;

    expect(result.density).toBe('high');
    expect(result.zoneId).toBe('concourse-N');
  });

  test('returns error for unknown zone', async () => {
    mockGetCrowdDensity.mockReturnValue(null);

    const result = await executeToolCall('getCrowdDensity', { zone: 'invalid-zone' }) as any;

    expect(result.error).toContain('invalid-zone');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Tool Executor: getWaitTime', () => {
  test('returns wait time for a known amenity', async () => {
    const mockWait = {
      amenityId: 'restroom-N1',
      amenityName: 'Restrooms — North Lower',
      estimatedWaitMinutes: 5,
      queueLength: 'moderate' as const,
      updatedAt: '2026-07-17T00:00:00Z',
    };
    mockGetWaitTime.mockReturnValue(mockWait);

    const result = await executeToolCall('getWaitTime', { amenityId: 'restroom-N1' }) as any;

    expect(result.estimatedWaitMinutes).toBe(5);
    expect(result.queueLength).toBe('moderate');
  });

  test('returns error for unknown amenity', async () => {
    mockGetWaitTime.mockReturnValue(null);

    const result = await executeToolCall('getWaitTime', { amenityId: 'nonexistent' }) as any;

    expect(result.error).toContain('Amenity not found');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Tool Executor: getTransportOptions', () => {
  test('returns transit recommendations for matching destination', async () => {
    const mockRecs = [
      {
        option: {
          id: 'njt-meadowlands',
          name: 'NJ Transit — Meadowlands Rail',
          type: 'rail' as const,
          description: '...',
          hub: 'transit-N',
          destinations: [{ name: 'Penn Station (NYC)', travelMinutes: 35, walkToHubMinutes: 10 }],
          frequency: 'Every 15 min',
          accessible: true,
          accessibilityNotes: 'Accessible.',
        },
        recommendedDestination: { name: 'Penn Station (NYC)', travelMinutes: 35, walkToHubMinutes: 10 },
        leaveByTime: '6:30 PM',
        totalJourneyMinutes: 60,
        bufferMinutes: 15,
      },
    ];
    mockGetTransportOptions.mockReturnValue(mockRecs);

    const result = await executeToolCall('getTransportOptions', {
      destination: 'Penn Station',
      kickoffOffsetMinutes: -30,
    }) as any;

    expect(result.options).toHaveLength(1);
    expect(result.options[0].leaveByTime).toBe('6:30 PM');
  });

  test('returns hub guidance when no matching destinations found', async () => {
    mockGetTransportOptions.mockReturnValue([]);

    const result = await executeToolCall('getTransportOptions', {
      destination: 'Tokyo',
      kickoffOffsetMinutes: 0,
    }) as any;

    expect(result.availableHubs).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Tool Executor: getAccessibilityInfo', () => {
  test('returns accessibility info for a known gate', async () => {
    const mockInfo = {
      gateId: 'gate-A',
      gateLabel: 'Gate A (North)',
      nearestAccessibleRestroom: { id: 'restroom-N1', label: 'Restrooms — North Lower', walkMinutes: 2 },
      nearestLift: { id: 'lift-NW', label: 'Elevator — North-West', walkMinutes: 1 },
      quietRoom: null,
      aslHelpPoint: null,
      wheelchairRoute: 'Enter via ramp on the right side of Gate A.',
      sensoryFriendlyZones: ['Quiet Room / Sensory Zone — West'],
      notes: 'Contact any steward.',
    };
    mockGetAccessibilityInfo.mockReturnValue(mockInfo);

    const result = await executeToolCall('getAccessibilityInfo', { gateId: 'gate-A' }) as any;

    expect(result.gateId).toBe('gate-A');
    expect(result.nearestLift).toBeDefined();
    expect(result.wheelchairRoute).toContain('ramp');
  });

  test('returns error for unknown gate', async () => {
    mockGetAccessibilityInfo.mockReturnValue(null);

    const result = await executeToolCall('getAccessibilityInfo', { gateId: 'gate-Z' }) as any;

    expect(result.error).toContain('gate-Z');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Tool Executor: Error Handling', () => {
  test('unknown tool name returns graceful error', async () => {
    const result = await executeToolCall('unknownTool', {}) as any;
    expect(result.error).toContain('Unknown tool');
  });
});
