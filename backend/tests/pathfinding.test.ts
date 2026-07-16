/**
 * FanGuide AI — Unit Tests: Dijkstra Pathfinding
 *
 * Tests the pathfinding algorithm in isolation with a minimal test graph.
 * Covers:
 *   1. Correct shortest path on a simple graph
 *   2. Accessibility mode: excludes non-accessible edges (stairs)
 *   3. Same-node routing (zero cost)
 *   4. Unreachable destination in accessibility mode
 *   5. Invalid node IDs throw descriptively
 *   6. Correct step count and total duration
 */

import { findRoute } from '../src/pathfinding/dijkstra';
import type { StadiumGraph } from '../src/types/stadium';

// ── Minimal test graph ────────────────────────────────────────────────────────
//
//   A ---60s(walkway)--- B ---30s(stairs,NOT accessible)--- C
//   |                                                        |
//   +--------90s(lift, accessible)--- D ---40s(walkway)-----+
//
// Standard shortest path A→C: A→B→C (90s)
// Accessibility path A→C: A→D→C (130s, avoids stairs)

const TEST_GRAPH: StadiumGraph = {
  nodes: [
    { id: 'A', label: 'Node A', type: 'gate', level: 0, x: 0, y: 0, accessible: true },
    { id: 'B', label: 'Node B', type: 'concourse', level: 1, x: 100, y: 0, accessible: true },
    { id: 'C', label: 'Node C', type: 'section', level: 2, x: 200, y: 0, accessible: true },
    { id: 'D', label: 'Node D (Lift)', type: 'lift', level: 1, x: 100, y: 100, accessible: true },
  ],
  edges: [
    { from: 'A', to: 'B', weight: 60, accessible: true, via: 'walkway' },
    { from: 'B', to: 'C', weight: 30, accessible: false, via: 'stairs' }, // STAIRS
    { from: 'A', to: 'D', weight: 90, accessible: true, via: 'lift' },
    { from: 'D', to: 'C', weight: 40, accessible: true, via: 'walkway' },
  ],
};

describe('Dijkstra Pathfinding', () => {
  describe('Standard mode (accessibility off)', () => {
    test('finds the shortest path A → C via stairs (90s < 130s)', () => {
      const result = findRoute(TEST_GRAPH, 'A', 'C', false);

      expect(result).not.toBeNull();
      expect(result!.totalDurationSeconds).toBe(90); // 60 + 30
      expect(result!.nodePath).toEqual(['A', 'B', 'C']);
      expect(result!.accessibilityMode).toBe(false);
    });

    test('returns correct step count', () => {
      const result = findRoute(TEST_GRAPH, 'A', 'C', false);
      expect(result!.steps).toHaveLength(2); // A→B, B→C
    });

    test('step details are populated correctly', () => {
      const result = findRoute(TEST_GRAPH, 'A', 'C', false);
      const firstStep = result!.steps[0];

      expect(firstStep.from).toBe('A');
      expect(firstStep.to).toBe('B');
      expect(firstStep.fromLabel).toBe('Node A');
      expect(firstStep.toLabel).toBe('Node B');
      expect(firstStep.durationSeconds).toBe(60);
      expect(firstStep.via).toBe('walkway');
    });
  });

  describe('Accessibility mode (stairs excluded)', () => {
    test('finds the accessible path A → C via lift (130s, avoids stairs)', () => {
      const result = findRoute(TEST_GRAPH, 'A', 'C', true);

      expect(result).not.toBeNull();
      expect(result!.totalDurationSeconds).toBe(130); // 90 + 40
      expect(result!.nodePath).toEqual(['A', 'D', 'C']);
      expect(result!.accessibilityMode).toBe(true);
    });

    test('all steps in accessibility mode use accessible edges only', () => {
      const result = findRoute(TEST_GRAPH, 'A', 'C', true);
      for (const step of result!.steps) {
        expect(step.accessible).toBe(true);
      }
    });

    test('returns null if destination is only reachable via stairs', () => {
      // Graph where B is only reachable via stairs from A
      const stairsOnlyGraph: StadiumGraph = {
        nodes: [
          { id: 'X', label: 'X', type: 'gate', level: 0, x: 0, y: 0, accessible: true },
          { id: 'Y', label: 'Y', type: 'section', level: 2, x: 100, y: 0, accessible: true },
        ],
        edges: [
          { from: 'X', to: 'Y', weight: 60, accessible: false, via: 'stairs' },
        ],
      };

      const result = findRoute(stairsOnlyGraph, 'X', 'Y', true);
      expect(result).toBeNull();
    });
  });

  describe('Edge cases', () => {
    test('same source and destination returns zero-cost route', () => {
      const result = findRoute(TEST_GRAPH, 'A', 'A', false);

      expect(result).not.toBeNull();
      expect(result!.totalDurationSeconds).toBe(0);
      expect(result!.steps).toHaveLength(0);
      expect(result!.nodePath).toEqual(['A']);
    });

    test('throws if source node does not exist', () => {
      expect(() => findRoute(TEST_GRAPH, 'INVALID', 'C', false)).toThrow(
        'Source node "INVALID" not found'
      );
    });

    test('throws if destination node does not exist', () => {
      expect(() => findRoute(TEST_GRAPH, 'A', 'INVALID', false)).toThrow(
        'Destination node "INVALID" not found'
      );
    });

    test('handles disconnected graph (no path exists)', () => {
      const disconnectedGraph: StadiumGraph = {
        nodes: [
          { id: 'P', label: 'P', type: 'gate', level: 0, x: 0, y: 0, accessible: true },
          { id: 'Q', label: 'Q', type: 'gate', level: 0, x: 100, y: 0, accessible: true },
        ],
        edges: [], // No edges — no path
      };

      const result = findRoute(disconnectedGraph, 'P', 'Q', false);
      expect(result).toBeNull();
    });
  });

  describe('Path optimality', () => {
    test('chooses shorter of two parallel paths', () => {
      // A → B (10s) vs A → C → B (5 + 4 = 9s)
      const multiPathGraph: StadiumGraph = {
        nodes: [
          { id: 'A', label: 'A', type: 'gate', level: 0, x: 0, y: 0, accessible: true },
          { id: 'B', label: 'B', type: 'gate', level: 0, x: 100, y: 0, accessible: true },
          { id: 'C', label: 'C', type: 'gate', level: 0, x: 50, y: 50, accessible: true },
        ],
        edges: [
          { from: 'A', to: 'B', weight: 10, accessible: true, via: 'walkway' },
          { from: 'A', to: 'C', weight: 5, accessible: true, via: 'walkway' },
          { from: 'C', to: 'B', weight: 4, accessible: true, via: 'walkway' },
        ],
      };

      const result = findRoute(multiPathGraph, 'A', 'B', false);
      expect(result!.totalDurationSeconds).toBe(9); // Via C is shorter
      expect(result!.nodePath).toEqual(['A', 'C', 'B']);
    });
  });
});
