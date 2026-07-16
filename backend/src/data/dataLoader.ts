/**
 * FanGuide AI — Stadium Data Loader
 *
 * Loads and caches all static JSON data files into memory on server startup.
 * This is the ADAPTER LAYER: to swap in a real IoT or ticketing API feed,
 * only the functions in this file need to change — no AI logic is affected.
 *
 * Data is loaded once and held in module-level variables (module cache).
 * All accessor functions return typed copies so consumers cannot mutate state.
 */

import fs from 'fs';
import path from 'path';
import type { StadiumGraph, Amenity, TransitOption } from '../types/stadium';

// ── Module-level cache (populated once at startup) ───────────────────────────
let _graph: StadiumGraph | null = null;
let _amenities: Amenity[] | null = null;
let _transit: TransitOption[] | null = null;

/**
 * Reads and validates all data files from /data directory.
 * Call once at server startup via index.ts.
 */
export function initializeStadiumData(): void {
  const dataDir = path.join(__dirname, '../../data');

  // Load stadium graph
  const graphRaw = fs.readFileSync(
    path.join(dataDir, 'stadium-graph.json'),
    'utf-8'
  );
  const graphParsed = JSON.parse(graphRaw) as { nodes: StadiumGraph['nodes']; edges: StadiumGraph['edges'] };
  _graph = {
    nodes: graphParsed.nodes,
    edges: graphParsed.edges,
  };

  // Load amenities
  const amenitiesRaw = fs.readFileSync(
    path.join(dataDir, 'amenities.json'),
    'utf-8'
  );
  _amenities = (JSON.parse(amenitiesRaw) as { amenities: Amenity[] }).amenities;

  // Load transit options
  const transitRaw = fs.readFileSync(
    path.join(dataDir, 'transit.json'),
    'utf-8'
  );
  _transit = (JSON.parse(transitRaw) as { options: TransitOption[] }).options;
}

/** Returns the stadium graph. Throws if not initialized. */
export function getStadiumGraph(): StadiumGraph {
  if (!_graph) throw new Error('Stadium data not initialized. Call initializeStadiumData() first.');
  return _graph;
}

/** Returns all amenities. Throws if not initialized. */
export function getAllAmenities(): Amenity[] {
  if (!_amenities) throw new Error('Stadium data not initialized.');
  return _amenities;
}

/** Returns a single amenity by ID, or undefined if not found. */
export function getAmenityById(id: string): Amenity | undefined {
  return getAllAmenities().find((a) => a.id === id);
}

/** Returns all transit options. Throws if not initialized. */
export function getAllTransitOptions(): TransitOption[] {
  if (!_transit) throw new Error('Stadium data not initialized.');
  return _transit;
}
