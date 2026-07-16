/**
 * FanGuide AI — TypeScript Types for Stadium Domain
 *
 * Shared type definitions used across the backend. Keeping types
 * in a dedicated file prevents circular imports and makes the
 * domain model easy to audit and extend.
 */

// ── Stadium Graph ─────────────────────────────────────────────────────────────

export type NodeType =
  | 'gate'
  | 'concourse'
  | 'section'
  | 'restroom'
  | 'food'
  | 'merch'
  | 'firstaid'
  | 'accessibility'
  | 'transit'
  | 'lift'
  | 'stairs';

export interface StadiumNode {
  id: string;
  label: string;
  type: NodeType;
  level: number; // 0 = ground, 1 = lower bowl, 2 = upper bowl
  x: number;    // SVG coordinate x
  y: number;    // SVG coordinate y
  accessible: boolean;
}

export interface StadiumEdge {
  from: string;
  to: string;
  weight: number;      // Walking time in seconds
  accessible: boolean; // False = stairs only (skipped in accessibility mode)
  via: string;         // e.g., 'walkway', 'lift', 'stairs', 'ramp'
  liftId?: string;
  stairsId?: string;
}

export interface StadiumGraph {
  nodes: StadiumNode[];
  edges: StadiumEdge[];
}

// ── Pathfinding ───────────────────────────────────────────────────────────────

export interface RouteStep {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  durationSeconds: number;
  via: string;
  accessible: boolean;
}

export interface RouteResult {
  from: string;
  to: string;
  totalDurationSeconds: number;
  steps: RouteStep[];
  accessibilityMode: boolean;
  /** Path as ordered array of node IDs for SVG rendering */
  nodePath: string[];
}

// ── Amenities ─────────────────────────────────────────────────────────────────

export interface Amenity {
  id: string;
  name: string;
  type: string;
  nodeId: string;
  accessible: boolean;
  features?: string[];
  gender?: string;
  level: number;
  dietaryOptions?: string[];
  vendors?: string[];
  staffed?: boolean;
  defibrillatorOnSite?: boolean;
  accessibilityNotes?: string;
}

// ── Crowd Density ─────────────────────────────────────────────────────────────

export type DensityLevel = 'low' | 'medium' | 'high';

export interface ZoneDensity {
  zoneId: string;
  zoneLabel: string;
  density: DensityLevel;
  /** Estimated people per 100m² — for heatmap color scaling */
  estimatedOccupancy: number;
  updatedAt: string; // ISO timestamp
}

export interface CrowdDensityState {
  zones: Record<string, ZoneDensity>;
  lastRefreshed: string;
}

// ── Wait Times ────────────────────────────────────────────────────────────────

export interface WaitTimeResult {
  amenityId: string;
  amenityName: string;
  estimatedWaitMinutes: number;
  queueLength: 'none' | 'short' | 'moderate' | 'long';
  updatedAt: string;
}

// ── Transit ───────────────────────────────────────────────────────────────────

export interface TransitDestination {
  name: string;
  travelMinutes: number;
  walkToHubMinutes: number;
}

export interface TransitOption {
  id: string;
  name: string;
  type: 'rail' | 'shuttle' | 'bus' | 'rideshare';
  description: string;
  hub: string;
  destinations: TransitDestination[];
  frequency: string;
  accessible: boolean;
  accessibilityNotes: string;
}

export interface TransitRecommendation {
  option: TransitOption;
  recommendedDestination: TransitDestination;
  leaveByTime: string; // HH:MM local time
  totalJourneyMinutes: number;
  bufferMinutes: number;
}

// ── Accessibility ─────────────────────────────────────────────────────────────

export interface AccessibilityInfo {
  gateId: string;
  gateLabel: string;
  nearestAccessibleRestroom: { id: string; label: string; walkMinutes: number } | null;
  nearestLift: { id: string; label: string; walkMinutes: number } | null;
  quietRoom: { id: string; label: string; walkMinutes: number } | null;
  aslHelpPoint: { id: string; label: string; walkMinutes: number } | null;
  wheelchairRoute: string;
  sensoryFriendlyZones: string[];
  notes: string;
}

// ── Chat Context ──────────────────────────────────────────────────────────────

export interface ChatContext {
  seat?: string;
  gate?: string;
  language: string;
  accessibilityNeeds?: string[];
  currentTime?: string;
  stadiumId: string;
  sessionId: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export type QueryCategory =
  | 'navigation'
  | 'food'
  | 'restroom'
  | 'transit'
  | 'accessibility'
  | 'emergency'
  | 'merchandise'
  | 'other';

export interface AnonymizedQueryRecord {
  /** No PII — only category, timestamp, and urgency flag are stored */
  category: QueryCategory;
  timestamp: string;
  isUrgent: boolean;
  sessionHash: string; // One-way hash of session ID — no user identity
}

export interface DashboardData {
  queryCounts: Record<QueryCategory, number>;
  urgentAlerts: AnonymizedQueryRecord[];
  crowdDensity: CrowdDensityState;
  totalQueriesLast5Min: number;
}
