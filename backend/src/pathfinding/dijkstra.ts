/**
 * FanGuide AI — Dijkstra Pathfinding Algorithm
 *
 * Computes the shortest path between two nodes in the stadium graph.
 * Supports two modes:
 *   - Standard: shortest path by walking time
 *   - Accessibility: excludes non-accessible edges (stairs), favors
 *     ramps and lifts even if slightly longer
 *
 * The graph is an undirected weighted graph where each edge has a
 * `weight` (walking time in seconds) and an `accessible` flag.
 *
 * Time complexity: O((V + E) log V) with a priority queue.
 *
 * @see https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm
 */

import type { StadiumGraph, StadiumEdge, RouteResult, RouteStep } from '../types/stadium';

// ── Priority Queue (min-heap) ─────────────────────────────────────────────────
// Simple binary min-heap for Dijkstra. Using a full heap is critical for
// correctness on large graphs; a simple sorted array would be O(V²).

interface HeapNode {
  id: string;
  dist: number;
}

class MinHeap {
  private heap: HeapNode[] = [];

  push(node: HeapNode): void {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop(): HeapNode | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  get size(): number {
    return this.heap.length;
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].dist <= this.heap[i].dist) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private _sinkDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.heap[l].dist < this.heap[smallest].dist) smallest = l;
      if (r < n && this.heap[r].dist < this.heap[smallest].dist) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

// ── Graph Adjacency List Builder ──────────────────────────────────────────────

interface AdjEntry {
  to: string;
  weight: number;
  edge: StadiumEdge;
}

/**
 * Builds an undirected adjacency list from the graph edges.
 * In accessibility mode, edges flagged `accessible: false` are excluded.
 */
function buildAdjacencyList(
  graph: StadiumGraph,
  accessibilityMode: boolean
): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();

  // Initialize all nodes
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of graph.edges) {
    // In accessibility mode, skip non-accessible edges (e.g., stairs)
    if (accessibilityMode && !edge.accessible) continue;

    // Undirected: add both directions
    adj.get(edge.from)?.push({ to: edge.to, weight: edge.weight, edge });
    adj.get(edge.to)?.push({ to: edge.from, weight: edge.weight, edge });
  }

  return adj;
}

// ── Dijkstra Implementation ───────────────────────────────────────────────────

interface DijkstraResult {
  dist: Map<string, number>;
  prev: Map<string, { nodeId: string; edge: StadiumEdge } | null>;
}

function dijkstra(
  adj: Map<string, AdjEntry[]>,
  source: string
): DijkstraResult {
  const dist = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; edge: StadiumEdge } | null>();

  // Initialize all distances to infinity
  for (const nodeId of adj.keys()) {
    dist.set(nodeId, Infinity);
    prev.set(nodeId, null);
  }
  dist.set(source, 0);

  const pq = new MinHeap();
  pq.push({ id: source, dist: 0 });

  while (pq.size > 0) {
    const { id: u, dist: d } = pq.pop()!;

    // Skip if we've already found a shorter path (stale heap entry)
    if (d > (dist.get(u) ?? Infinity)) continue;

    for (const { to: v, weight, edge } of adj.get(u) ?? []) {
      const alt = d + weight;
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, { nodeId: u, edge });
        pq.push({ id: v, dist: alt });
      }
    }
  }

  return { dist, prev };
}

// ── Path Reconstruction ───────────────────────────────────────────────────────

function reconstructPath(
  prev: Map<string, { nodeId: string; edge: StadiumEdge } | null>,
  source: string,
  target: string
): Array<{ nodeId: string; edge: StadiumEdge | null }> {
  const path: Array<{ nodeId: string; edge: StadiumEdge | null }> = [];
  let current: string | null = target;

  while (current !== null) {
    const entry: { nodeId: string; edge: StadiumEdge } | null = prev.get(current) ?? null;
    path.unshift({ nodeId: current, edge: entry?.edge ?? null });
    if (current === source) break;
    current = entry?.nodeId ?? null;
  }

  // If path doesn't start at source, no route was found
  if (path.length === 0 || path[0].nodeId !== source) return [];

  return path;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Finds the optimal route between two stadium nodes.
 *
 * @param graph           The stadium graph (loaded once at startup)
 * @param fromId          Source node ID
 * @param toId            Destination node ID
 * @param accessibilityMode  If true, avoids stairs and uses ramps/lifts
 * @returns               RouteResult with step-by-step directions, or null if no path found
 */
export function findRoute(
  graph: StadiumGraph,
  fromId: string,
  toId: string,
  accessibilityMode: boolean
): RouteResult | null {
  // Validate nodes exist
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodeMap.has(fromId)) {
    throw new Error(`Source node "${fromId}" not found in stadium graph.`);
  }
  if (!nodeMap.has(toId)) {
    throw new Error(`Destination node "${toId}" not found in stadium graph.`);
  }

  if (fromId === toId) {
    // Already at destination
    return {
      from: fromId,
      to: toId,
      totalDurationSeconds: 0,
      steps: [],
      accessibilityMode,
      nodePath: [fromId],
    };
  }

  const adj = buildAdjacencyList(graph, accessibilityMode);
  const { dist, prev } = dijkstra(adj, fromId);

  const totalDuration = dist.get(toId) ?? Infinity;
  if (totalDuration === Infinity) {
    // No accessible path exists — this can happen if accessibility mode
    // isolates sections of the graph
    return null;
  }

  const rawPath = reconstructPath(prev, fromId, toId);
  if (rawPath.length === 0) return null;

  // Build human-readable steps
  const steps: RouteStep[] = [];
  for (let i = 1; i < rawPath.length; i++) {
    const prevEntry = rawPath[i - 1];
    const currEntry = rawPath[i];
    const edge = currEntry.edge!;

    const fromNode = nodeMap.get(prevEntry.nodeId)!;
    const toNode = nodeMap.get(currEntry.nodeId)!;

    steps.push({
      from: fromNode.id,
      to: toNode.id,
      fromLabel: fromNode.label,
      toLabel: toNode.label,
      durationSeconds: edge.weight,
      via: edge.via,
      accessible: edge.accessible,
    });
  }

  const nodePath = rawPath.map((p) => p.nodeId);

  return {
    from: fromId,
    to: toId,
    totalDurationSeconds: totalDuration,
    steps,
    accessibilityMode,
    nodePath,
  };
}
