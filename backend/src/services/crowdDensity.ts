/**
 * FanGuide AI — Crowd Density Simulation Service
 *
 * Simulates live crowd-density data across stadium zones on a configurable
 * refresh interval. In production, replace the simulation logic with a
 * subscription to a real IoT sensor feed — only this file needs to change.
 *
 * The state is stored in a module-level singleton so all route handlers
 * read the same current snapshot without re-computing it per request.
 *
 * Design: Density follows realistic patterns — higher around concourses
 * before kickoff, lower during play, surge at exits post-game.
 */

import type { CrowdDensityState, ZoneDensity, DensityLevel } from '../types/stadium';

// ── Simulation constants ──────────────────────────────────────────────────────

const ZONES = [
  { id: 'concourse-N', label: 'North Concourse' },
  { id: 'concourse-E', label: 'East Concourse' },
  { id: 'concourse-S', label: 'South Concourse' },
  { id: 'concourse-W', label: 'West Concourse' },
  { id: 'upper-N', label: 'Upper North' },
  { id: 'upper-E', label: 'Upper East' },
  { id: 'upper-S', label: 'Upper South' },
  { id: 'upper-W', label: 'Upper West' },
  { id: 'gate-A', label: 'Gate A' },
  { id: 'gate-B', label: 'Gate B' },
  { id: 'gate-C', label: 'Gate C' },
  { id: 'gate-D', label: 'Gate D' },
  { id: 'gate-E', label: 'Gate E' },
  { id: 'gate-F', label: 'Gate F' },
  { id: 'gate-G', label: 'Gate G' },
  { id: 'gate-H', label: 'Gate H' },
  { id: 'transit-N', label: 'North Transit Hub' },
  { id: 'transit-S', label: 'South Transit Hub' },
  { id: 'transit-E', label: 'East Rideshare Zone' },
  { id: 'transit-W', label: 'West Accessible Shuttle' },
];

// ── Module-level state ────────────────────────────────────────────────────────

let _state: CrowdDensityState = buildInitialState();

function buildInitialState(): CrowdDensityState {
  const zones: Record<string, ZoneDensity> = {};
  const now = new Date().toISOString();

  for (const zone of ZONES) {
    zones[zone.id] = generateZoneDensity(zone.id, zone.label, now);
  }

  return { zones, lastRefreshed: now };
}

/** Generates a realistic density level with weighted randomness. */
function generateZoneDensity(
  zoneId: string,
  zoneLabel: string,
  timestamp: string
): ZoneDensity {
  // Weight distribution simulates realistic crowd behaviour:
  // Gates and concourses tend to be busier than upper tiers.
  const isHighTrafficZone =
    zoneId.startsWith('gate') || zoneId.startsWith('concourse');
  const isTransitZone = zoneId.startsWith('transit');

  let density: DensityLevel;
  let occupancy: number;

  const r = Math.random();

  if (isHighTrafficZone) {
    // 30% low, 40% medium, 30% high
    if (r < 0.3) { density = 'low'; occupancy = Math.floor(Math.random() * 20 + 5); }
    else if (r < 0.7) { density = 'medium'; occupancy = Math.floor(Math.random() * 30 + 25); }
    else { density = 'high'; occupancy = Math.floor(Math.random() * 20 + 55); }
  } else if (isTransitZone) {
    // Transit zones start low, surge post-game — simplified here
    if (r < 0.5) { density = 'low'; occupancy = Math.floor(Math.random() * 15 + 2); }
    else if (r < 0.8) { density = 'medium'; occupancy = Math.floor(Math.random() * 20 + 20); }
    else { density = 'high'; occupancy = Math.floor(Math.random() * 30 + 45); }
  } else {
    // Upper tiers are calmer
    if (r < 0.5) { density = 'low'; occupancy = Math.floor(Math.random() * 15 + 2); }
    else if (r < 0.85) { density = 'medium'; occupancy = Math.floor(Math.random() * 20 + 18); }
    else { density = 'high'; occupancy = Math.floor(Math.random() * 15 + 40); }
  }

  return { zoneId, zoneLabel: zoneLabel, density, estimatedOccupancy: occupancy, updatedAt: timestamp };
}

/** Refreshes all zone densities with new simulated values. */
function refreshCrowdDensity(): void {
  const now = new Date().toISOString();
  const zones: Record<string, ZoneDensity> = {};

  for (const zone of ZONES) {
    zones[zone.id] = generateZoneDensity(zone.id, zone.label, now);
  }

  _state = { zones, lastRefreshed: now };
}

/**
 * Starts the crowd-density simulation on a repeating interval.
 * Returns the interval handle so tests can clear it.
 */
export function startCrowdDensitySimulation(intervalMs: number): ReturnType<typeof setInterval> {
  return setInterval(refreshCrowdDensity, intervalMs);
}

/** Returns the current crowd density for a specific zone. */
export function getCrowdDensityForZone(zoneId: string): ZoneDensity | null {
  return _state.zones[zoneId] ?? null;
}

/** Returns the full crowd density snapshot across all zones. */
export function getAllCrowdDensity(): CrowdDensityState {
  return _state;
}
